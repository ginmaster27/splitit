import { create } from "zustand";
import { createSettlement } from "@/services/firebase/firestore";
import { computeBalances } from "@/utils/balanceEngine";
import { Expense, Settlement } from "@/types";

interface SettlementState {
  settlements: Settlement[];
  settle: (settlement: Omit<Settlement, "id" | "status" | "createdAt">, expenses: Expense[]) => Promise<Settlement>;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlements: [],
  settle: async (input, expenses) => {
    const optimistic: Settlement = { id: `local-${Date.now()}`, status: "paid", createdAt: Date.now(), ...input };
    set({ settlements: [optimistic, ...get().settlements] });
    const balances = computeBalances(expenses, [optimistic]).netBalances;
    const created = await createSettlement({ ...input, status: "paid", createdAt: optimistic.createdAt }, balances);
    set({ settlements: get().settlements.map((item) => (item.id === optimistic.id ? created : item)) });
    return created;
  }
}));
