import { create } from "zustand";
import type { Unsubscribe } from "firebase/firestore";
import { cache } from "@/services/cache/cache";
import { fetchDashboardSummary, listenDashboard, listenRecentExpenses, listenUserGroups } from "@/services/firebase/firestore";
import { DashboardSummary } from "@/types";

interface DashboardState {
  summary?: DashboardSummary;
  loading: boolean;
  hydrateDashboard: (userId: string) => Promise<void>;
  refreshDashboard: (userId: string) => Promise<void>;
  listen: (userId: string) => Unsubscribe[];
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  loading: false,
  hydrateDashboard: async (userId) => {
    const cached = await cache.readDashboard(userId);
    if (cached) set({ summary: cached });
    await get().refreshDashboard(userId);
  },
  refreshDashboard: async (userId) => {
    set({ loading: true });
    const summary = await fetchDashboardSummary(userId);
    set({ summary, loading: false });
    await cache.writeDashboard(userId, summary);
  },
  listen: (userId) => [
    listenDashboard(userId, async (patch) => {
      const current = get().summary;
      const hasGroupTotals = Boolean(current?.activeGroups?.length);
      const next = {
        ...(current ?? { activeGroups: [], recentExpenses: [], updatedAt: Date.now() }),
        ...patch,
        ...(hasGroupTotals
          ? {
              totalOwed: current?.totalOwed ?? 0,
              totalReceivable: current?.totalReceivable ?? 0,
              netBalance: current?.netBalance ?? 0
            }
          : {})
      } as DashboardSummary;
      set({ summary: next });
      await cache.writeDashboard(userId, next);
    }),
    listenUserGroups(userId, async (activeGroups, totals) => {
      const next = {
        ...(get().summary ?? { recentExpenses: [], updatedAt: Date.now() }),
        ...totals,
        activeGroups,
        updatedAt: Date.now()
      } as DashboardSummary;
      set({ summary: next });
      await cache.writeDashboard(userId, next);
      await cache.writeGroups(userId, activeGroups);
    }),
    listenRecentExpenses(userId, async (recentExpenses) => {
      const next = { ...(get().summary ?? { activeGroups: [], totalOwed: 0, totalReceivable: 0, netBalance: 0, updatedAt: Date.now() }), recentExpenses } as DashboardSummary;
      set({ summary: next });
      await cache.writeDashboard(userId, next);
    })
  ]
}));
