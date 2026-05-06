import { create } from "zustand";
import { cache } from "@/services/cache/cache";
import { cleanupOldActivitiesForGroups, fetchActivitiesForGroups } from "@/services/firebase/firestore";
import { ActivityItem, Group } from "@/types";

interface ActivityState {
  activities: ActivityItem[];
  loading: boolean;
  error?: string;
  hydrateActivities: (userId: string, groups: Group[]) => Promise<void>;
  refreshActivities: (userId: string, groups: Group[]) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set) => ({
  activities: [],
  loading: false,
  hydrateActivities: async (userId, groups) => {
    const cached = await cache.readActivities(userId);
    if (cached) set({ activities: cached });
    await useActivityStore.getState().refreshActivities(userId, groups);
  },
  refreshActivities: async (userId, groups) => {
    set({ loading: true, error: undefined });
    try {
      const groupIds = groups.map((group) => group.id);
      await cleanupOldActivitiesForGroups(groupIds);
      const activities = await fetchActivitiesForGroups(groupIds);
      set({ activities, loading: false });
      await cache.writeActivities(userId, activities);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load activity", loading: false });
    }
  }
}));
