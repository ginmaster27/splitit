import { create } from "zustand";
import { cache } from "@/services/cache/cache";
import { computeBalances } from "@/utils/balanceEngine";
import { BalanceResult, Expense, Settlement } from "@/types";

interface BalanceState {
  byGroup: Record<string, BalanceResult>;
  hydrateBalances: (groupId: string) => Promise<void>;
  recompute: (groupId: string, expenses: Expense[], settlements?: Settlement[]) => Promise<BalanceResult>;
}

const empty: BalanceResult = { memberBalances: {}, netBalances: {}, settlementSuggestions: [] };

export const useBalanceStore = create<BalanceState>((set, get) => ({
  byGroup: {},
  hydrateBalances: async (groupId) => {
    const cached = await cache.readBalances(groupId);
    if (cached) set({ byGroup: { ...get().byGroup, [groupId]: { ...empty, netBalances: cached } } });
  },
  recompute: async (groupId, expenses, settlements = []) => {
    const result = computeBalances(expenses, settlements);
    set({ byGroup: { ...get().byGroup, [groupId]: result } });
    await cache.writeBalances(groupId, result.netBalances);
    return result;
  }
}));
