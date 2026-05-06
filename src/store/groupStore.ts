import { create } from "zustand";
import type { Unsubscribe } from "firebase/firestore";
import { cache } from "@/services/cache/cache";
import {
  addGroupMember as addGroupMemberDoc,
  createActivity,
  createGroup as createGroupDoc,
  fetchGroup,
  fetchUserGroups,
  listenGroup,
  updateGroupName
} from "@/services/firebase/firestore";
import { Group, GroupType, UserProfile } from "@/types";

type GroupMemberProfile = Pick<UserProfile, "id" | "name" | "email" | "avatar" | "upiId">;

interface GroupState {
  groups: Group[];
  activeGroup?: Group;
  loading: boolean;
  error?: string;
  hydrateGroups: (userId: string) => Promise<void>;
  refreshGroups: (userId: string) => Promise<void>;
  createGroup: (input: { name: string; type: GroupType; members: UserProfile[]; currentUser: UserProfile }) => Promise<Group>;
  renameGroup: (input: { groupId: string; name: string; currentUserId: string; currentUserName: string }) => Promise<void>;
  addMemberToGroup: (input: { group: Group; member: GroupMemberProfile; currentUserId: string; currentUserName: string }) => Promise<Group>;
  refreshGroup: (groupId: string) => Promise<Group | null>;
  listenActiveGroup: (groupId: string) => Unsubscribe;
  patchGroup: (groupId: string, patch: Partial<Group>) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  loading: false,
  hydrateGroups: async (userId) => {
    const cached = await cache.readGroups(userId);
    if (cached) set({ groups: cached });
    await get().refreshGroups(userId);
  },
  refreshGroups: async (userId) => {
    set({ loading: true, error: undefined });
    try {
      const groups = await fetchUserGroups(userId);
      set({ groups, loading: false });
      await cache.writeGroups(userId, groups);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load groups", loading: false });
    }
  },
  createGroup: async ({ name, type, members, currentUser }) => {
    const allMembers = [currentUser, ...members.filter((member) => member.email !== currentUser.email)];
    const optimistic: Group = {
      id: `local-${Date.now()}`,
      name,
      type,
      memberIds: allMembers.map((member) => member.id),
      memberProfiles: allMembers.map(({ id, name: memberName, email, avatar, upiId }) => ({ id, name: memberName, email, avatar, upiId })),
      totalSpend: 0,
      balanceSummary: {},
      updatedAt: Date.now(),
      createdBy: currentUser.id
    };
    set({ groups: [optimistic, ...get().groups] });
    const { id: _localId, ...groupInput } = optimistic;
    const created = await createGroupDoc(groupInput);
    await createActivity({
      groupId: created.id,
      groupName: created.name,
      actorId: currentUser.id,
      actorName: currentUser.name,
      type: "group_created",
      sourceId: created.id,
      title: "Group created",
      description: `${currentUser.name} created ${created.name}`
    });
    const groups = get().groups.map((group) => (group.id === optimistic.id ? created : group));
    set({ groups });
    await cache.writeGroups(currentUser.id, groups);
    return created;
  },
  renameGroup: async ({ groupId, name, currentUserId, currentUserName }) => {
    const previousGroups = get().groups;
    const previousActive = get().activeGroup;
    const patch = { name, updatedAt: Date.now() };
    const nextGroups = previousGroups.map((group) => (group.id === groupId ? { ...group, ...patch } : group));
    const nextActive = previousActive?.id === groupId ? { ...previousActive, ...patch } : previousActive;
    set({ groups: nextGroups, activeGroup: nextActive });
    await cache.writeGroups(currentUserId, nextGroups);
    try {
      await updateGroupName(groupId, name);
      await createActivity({
        groupId,
        groupName: name,
        actorId: currentUserId,
        actorName: currentUserName,
        type: "group_renamed",
        sourceId: groupId,
        title: "Group renamed",
        description: `Group renamed to ${name}`
      });
      const refreshed = await fetchGroup(groupId);
      if (refreshed) {
        const groups = get().groups.map((group) => (group.id === groupId ? refreshed : group));
        set({ groups, activeGroup: refreshed });
        await cache.writeGroups(currentUserId, groups);
      }
    } catch (error) {
      set({ groups: previousGroups, activeGroup: previousActive });
      await cache.writeGroups(currentUserId, previousGroups);
      throw error;
    }
  },
  addMemberToGroup: async ({ group, member, currentUserId, currentUserName }) => {
    const previousGroups = get().groups;
    const previousActive = get().activeGroup;
    const optimistic: Group = {
      ...group,
      memberIds: [...group.memberIds, member.id],
      memberProfiles: [...group.memberProfiles, member],
      balanceSummary: { ...group.balanceSummary, [member.id]: group.balanceSummary[member.id] ?? 0 },
      updatedAt: Date.now()
    };
    const nextGroups = previousGroups.map((item) => (item.id === group.id ? optimistic : item));
    set({ groups: nextGroups, activeGroup: optimistic });
    await cache.writeGroups(currentUserId, nextGroups);
    try {
      const saved = await addGroupMemberDoc(group, member);
      await createActivity({
        groupId: group.id,
        groupName: group.name,
        actorId: currentUserId,
        actorName: currentUserName,
        type: "member_added",
        sourceId: member.id,
        title: "Member added",
        description: `${member.name} was added to ${group.name}`
      });
      const groups = get().groups.map((item) => (item.id === group.id ? saved : item));
      set({ groups, activeGroup: saved });
      await cache.writeGroups(currentUserId, groups);
      return saved;
    } catch (error) {
      set({ groups: previousGroups, activeGroup: previousActive });
      await cache.writeGroups(currentUserId, previousGroups);
      throw error;
    }
  },
  refreshGroup: async (groupId) => {
    const group = await fetchGroup(groupId);
    if (group) {
      set({ activeGroup: group, groups: get().groups.map((item) => (item.id === groupId ? group : item)) });
    }
    return group;
  },
  listenActiveGroup: (groupId) =>
    listenGroup(groupId, (group) => {
      if (!group) return;
      set({ activeGroup: group, groups: get().groups.map((item) => (item.id === groupId ? group : item)) });
    }),
  patchGroup: (groupId, patch) => {
    const activeGroup = get().activeGroup;
    set({
      groups: get().groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
      activeGroup: activeGroup?.id === groupId ? { ...activeGroup, ...patch } : activeGroup
    });
  }
}));
