import { create } from "zustand";
import { cache } from "@/services/cache/cache";
import { claimGuestMembershipsForUser, fetchDashboardSummary, fetchUser, updateUserProfile, upsertUser } from "@/services/firebase/firestore";
import { signInWithGoogle, signOut as firebaseSignOut } from "@/services/firebase/auth";
import { UserProfile } from "@/types";

interface UserState {
  user: UserProfile | null;
  loading: boolean;
  error?: string;
  hydrateSession: () => Promise<void>;
  login: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  saveProfile: (patch: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,
  hydrateSession: async () => {
    const cached = await cache.readSession();
    if (cached) {
      set({ user: cached, loading: false });
      try {
        await claimGuestMembershipsForUser(cached);
      } catch {
        // Keep cached login usable; Firestore listeners will surface access problems elsewhere.
      }
    }
    set({ loading: false });
  },
  login: async () => {
    set({ loading: true, error: undefined });
    try {
      const profile = await signInWithGoogle();
      if (!profile) throw new Error("Google login is unavailable on this platform in the MVP build.");
      const existing = await fetchUser(profile.id);
      const user = existing ? { ...profile, ...existing } : profile;
      await upsertUser(user);
      await claimGuestMembershipsForUser(user);
      await cache.writeSession(user);
      set({ user, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to sign in", loading: false });
    }
  },
  setUser: (user) => set({ user }),
  saveProfile: async (patch) => {
    const user = get().user;
    if (!user) return;
    const next = { ...user, ...patch, updatedAt: Date.now() };
    set({ user: next });
    await cache.writeSession(next);
    await updateUserProfile(user.id, patch);
    const refreshed = await fetchDashboardSummary(user.id);
    set({ user: { ...next, totalOwed: refreshed.totalOwed, totalReceivable: refreshed.totalReceivable, netBalance: refreshed.netBalance } });
  },
  logout: async () => {
    await firebaseSignOut();
    await cache.clearSession();
    set({ user: null });
  }
}));
