import { create } from "zustand";
import type { Unsubscribe } from "firebase/firestore";
import { cache } from "@/services/cache/cache";
import { addExpense as addExpenseDoc, createActivity, fetchGroupExpenses, listenGroupExpenses, updateExpense as updateExpenseDoc } from "@/services/firebase/firestore";
import { computeBalances } from "@/utils/balanceEngine";
import { Expense, Group } from "@/types";

interface ExpenseState {
  byGroup: Record<string, Expense[]>;
  recent: Expense[];
  loading: boolean;
  hydrateGroupExpenses: (groupId: string) => Promise<void>;
  refreshGroupExpenses: (groupId: string) => Promise<Expense[]>;
  addExpense: (expense: Omit<Expense, "id">, group: Group) => Promise<Expense>;
  updateExpense: (expenseId: string, expense: Omit<Expense, "id">, group: Group) => Promise<{ expense: Expense; groupPatch: Partial<Group> }>;
  listenExpenses: (groupId: string) => Unsubscribe;
  setGroupExpenses: (groupId: string, expenses: Expense[]) => Promise<void>;
  setRecent: (expenses: Expense[]) => void;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  byGroup: {},
  recent: [],
  loading: false,
  hydrateGroupExpenses: async (groupId) => {
    const cached = await cache.readGroupExpenses(groupId);
    if (cached) set({ byGroup: { ...get().byGroup, [groupId]: cached } });
    await get().refreshGroupExpenses(groupId);
  },
  refreshGroupExpenses: async (groupId) => {
    set({ loading: true });
    const expenses = await fetchGroupExpenses(groupId);
    set({ byGroup: { ...get().byGroup, [groupId]: expenses }, loading: false });
    await cache.writeGroupExpenses(groupId, expenses);
    return expenses;
  },
  addExpense: async (expense, group) => {
    const optimistic: Expense = { id: `local-${Date.now()}`, ...expense };
    const nextExpenses = [optimistic, ...(get().byGroup[group.id] ?? [])];
    const balances = computeBalances(nextExpenses).netBalances;
    set({ byGroup: { ...get().byGroup, [group.id]: nextExpenses }, recent: [optimistic, ...get().recent].slice(0, 10) });
    await cache.writeGroupExpenses(group.id, nextExpenses);
    const { expense: created } = await addExpenseDoc(expense, group, balances);
    await createActivity({
      groupId: group.id,
      groupName: group.name,
      actorId: expense.payerId,
      actorName: expense.payerName,
      type: "expense_added",
      sourceId: created.id,
      title: "Expense added",
      description: `${expense.payerName} added ${expense.title}`,
      amount: expense.amount,
      createdAt: expense.createdAt
    });
    const saved = nextExpenses.map((item) => (item.id === optimistic.id ? created : item));
    set({ byGroup: { ...get().byGroup, [group.id]: saved } });
    await cache.writeGroupExpenses(group.id, saved);
    return created;
  },
  updateExpense: async (expenseId, expense, group) => {
    const currentExpenses = get().byGroup[group.id] ?? [];
    const previousExpenses = currentExpenses;
    const nextExpenses = currentExpenses.map((item) => (item.id === expenseId ? { id: expenseId, ...expense } : item));
    const groupPatch = buildGroupPatchFromExpenses(group, nextExpenses);
    set({ byGroup: { ...get().byGroup, [group.id]: nextExpenses } });
    await cache.writeGroupExpenses(group.id, nextExpenses);
    try {
      const saved = await updateExpenseDoc(expenseId, expense, groupPatch);
      await createActivity({
        groupId: group.id,
        groupName: group.name,
        actorId: expense.payerId,
        actorName: expense.payerName,
        type: "expense_updated",
        sourceId: expenseId,
        title: "Expense updated",
        description: `${expense.title} was updated`,
        amount: expense.amount
      });
      const savedExpenses = nextExpenses.map((item) => (item.id === expenseId ? saved : item));
      set({ byGroup: { ...get().byGroup, [group.id]: savedExpenses } });
      await cache.writeGroupExpenses(group.id, savedExpenses);
      return { expense: saved, groupPatch };
    } catch (error) {
      set({ byGroup: { ...get().byGroup, [group.id]: previousExpenses } });
      await cache.writeGroupExpenses(group.id, previousExpenses);
      throw error;
    }
  },
  listenExpenses: (groupId) =>
    listenGroupExpenses(groupId, async (expenses) => {
      set({ byGroup: { ...get().byGroup, [groupId]: expenses } });
      await cache.writeGroupExpenses(groupId, expenses);
    }),
  setGroupExpenses: async (groupId, expenses) => {
    set({ byGroup: { ...get().byGroup, [groupId]: expenses } });
    await cache.writeGroupExpenses(groupId, expenses);
  },
  setRecent: (expenses) => set({ recent: expenses })
}));

function buildGroupPatchFromExpenses(group: Group, expenses: Expense[]): Partial<Group> {
  const sorted = [...expenses].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const latest = sorted[0];
  return {
    totalSpend: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    lastExpenseTitle: latest?.title,
    lastExpenseAt: latest?.createdAt,
    balanceSummary: computeBalances(expenses).netBalances,
    updatedAt: Date.now()
  };
}
