import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe
} from "firebase/firestore";
import { db } from "./config";
import { ActivityItem, DashboardSummary, Expense, Group, Settlement, UserProfile } from "@/types";

const now = () => Date.now();
const sortByUpdatedAt = (groups: Group[]) => [...groups].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
const sortByCreatedAt = (expenses: Expense[]) => [...expenses].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
const sortActivitiesByCreatedAt = (activities: ActivityItem[]) => [...activities].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
const thirtyDaysAgo = () => now() - 30 * 24 * 60 * 60 * 1000;
const dashboardTotalsFromGroups = (userId: string, groups: Group[]) => {
  const netBalance = groups.reduce((sum, group) => sum + (group.balanceSummary?.[userId] ?? 0), 0);
  return {
    totalOwed: groups.reduce((sum, group) => {
      const balance = group.balanceSummary?.[userId] ?? 0;
      return balance < 0 ? sum + Math.abs(balance) : sum;
    }, 0),
    totalReceivable: groups.reduce((sum, group) => {
      const balance = group.balanceSummary?.[userId] ?? 0;
      return balance > 0 ? sum + balance : sum;
    }, 0),
    netBalance
  };
};
const clean = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => clean(item)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, clean(item)])
    ) as T;
  }
  return value;
};

export const fromFirestoreTime = (value: unknown): number => {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return now();
};

export const userRef = (id: string) => doc(db, "users", id);
export const groupRef = (id: string) => doc(db, "groups", id);

export async function upsertUser(profile: UserProfile) {
  await setDoc(userRef(profile.id), clean(profile), { merge: true });
}

export async function fetchUser(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(userId));
  return snap.exists() ? ({ id: snap.id, ...snap.data(), updatedAt: fromFirestoreTime(snap.data().updatedAt) } as UserProfile) : null;
}

export async function fetchUserByEmail(email: string): Promise<UserProfile | null> {
  const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? ({ id: first.id, ...first.data(), updatedAt: fromFirestoreTime(first.data().updatedAt) } as UserProfile) : null;
}

export async function updateUserProfile(userId: string, patch: Partial<UserProfile>) {
  await updateDoc(userRef(userId), clean({ ...patch, updatedAt: now() }));
}

export async function claimGuestMembershipsForUser(user: UserProfile) {
  if (!user.email) return;
  const normalizedEmail = user.email.trim().toLowerCase();
  const membershipsQuery = query(collection(db, "groupMembers"), where("email", "==", normalizedEmail));
  const membershipsSnap = await getDocs(membershipsQuery);
  const memberships = membershipsSnap.docs
    .map((item) => ({ docId: item.id, ...(item.data() as { groupId?: string; userId?: string }) }))
    .filter((item) => item.groupId && item.userId && item.userId !== user.id);

  for (const membership of memberships) {
    const oldUserId = membership.userId as string;
    const groupId = membership.groupId as string;
    const group = await fetchGroup(groupId);
    if (!group) continue;

    const nextBalanceSummary = { ...(group.balanceSummary ?? {}) };
    if (oldUserId in nextBalanceSummary) {
      nextBalanceSummary[user.id] = (nextBalanceSummary[user.id] ?? 0) + (nextBalanceSummary[oldUserId] ?? 0);
      delete nextBalanceSummary[oldUserId];
    } else {
      nextBalanceSummary[user.id] = nextBalanceSummary[user.id] ?? 0;
    }

    const memberIds = Array.from(new Set(group.memberIds.map((id) => (id === oldUserId ? user.id : id))));
    if (!memberIds.includes(user.id)) memberIds.push(user.id);

    const memberProfiles = group.memberProfiles.map((member) =>
      member.id === oldUserId || member.email.toLowerCase() === normalizedEmail
        ? {
            ...member,
            id: user.id,
            name: user.name || member.name,
            email: user.email,
            avatar: user.avatar ?? member.avatar,
            upiId: user.upiId || member.upiId
          }
        : member
    );

    const expenseSnap = await getDocs(query(collection(db, "expenses"), where("groupId", "==", groupId)));
    const settlementSnap = await getDocs(query(collection(db, "settlements"), where("groupId", "==", groupId)));
    const batch = writeBatch(db);

    batch.update(groupRef(groupId), clean({
      memberIds,
      memberProfiles,
      balanceSummary: nextBalanceSummary,
      updatedAt: now()
    }));
    batch.update(doc(db, "groupMembers", membership.docId), clean({
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      upiId: user.upiId,
      updatedAt: now()
    }));

    expenseSnap.docs.forEach((expenseDoc) => {
      const expense = expenseDoc.data() as Expense;
      const patch = {
        payerId: expense.payerId === oldUserId ? user.id : expense.payerId,
        payerName: expense.payerId === oldUserId ? user.name : expense.payerName,
        participantIds: expense.participantIds.map((id) => (id === oldUserId ? user.id : id)),
        splits: expense.splits.map((split) => ({ ...split, userId: split.userId === oldUserId ? user.id : split.userId }))
      };
      batch.update(expenseDoc.ref, clean(patch));
    });

    settlementSnap.docs.forEach((settlementDoc) => {
      const settlement = settlementDoc.data() as Settlement;
      batch.update(settlementDoc.ref, clean({
        payerId: settlement.payerId === oldUserId ? user.id : settlement.payerId,
        receiverId: settlement.receiverId === oldUserId ? user.id : settlement.receiverId
      }));
    });

    await batch.commit();
  }
}

export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const q = query(collection(db, "groups"), where("memberIds", "array-contains", userId));
  const snap = await getDocs(q);
  return sortByUpdatedAt(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Group)));
}

export async function createActivity(activity: Omit<ActivityItem, "id" | "createdAt"> & { createdAt?: number }) {
  const ref = await addDoc(collection(db, "notifications"), clean({ ...activity, createdAt: activity.createdAt ?? now() }));
  return { id: ref.id, ...activity, createdAt: activity.createdAt ?? now() };
}

export async function fetchActivitiesForGroups(groupIds: string[]): Promise<ActivityItem[]> {
  if (!groupIds.length) return [];
  const cutoff = thirtyDaysAgo();
  const activities: ActivityItem[] = [];
  for (const groupId of groupIds) {
    const [snap, group, expenseSnap] = await Promise.all([
      getDocs(query(collection(db, "notifications"), where("groupId", "==", groupId))),
      fetchGroup(groupId),
      getDocs(query(collection(db, "expenses"), where("groupId", "==", groupId)))
    ]);
    activities.push(
      ...snap.docs
        .map((item) => ({ id: item.id, ...item.data() } as ActivityItem))
        .filter((activity) => (activity.createdAt ?? 0) >= cutoff)
    );
    const notificationSourceIds = new Set(activities.map((activity) => activity.sourceId).filter(Boolean));
    activities.push(
      ...expenseSnap.docs
        .map((item) => ({ id: item.id, ...item.data() } as Expense))
        .filter((expense) => (expense.createdAt ?? 0) >= cutoff && !notificationSourceIds.has(expense.id))
        .map((expense) => ({
          id: `expense-${expense.id}`,
          groupId,
          groupName: group?.name ?? "Group",
          actorId: expense.payerId,
          actorName: expense.payerName,
          type: "expense_added" as const,
          sourceId: expense.id,
          title: "Expense added",
          description: `${expense.payerName} added ${expense.title}`,
          amount: expense.amount,
          createdAt: expense.createdAt
        }))
    );
  }
  return sortActivitiesByCreatedAt(activities);
}

export async function cleanupOldActivitiesForGroups(groupIds: string[]) {
  if (!groupIds.length) return;
  const cutoff = thirtyDaysAgo();
  const deletes: Promise<void>[] = [];
  for (const groupId of groupIds) {
    const snap = await getDocs(query(collection(db, "notifications"), where("groupId", "==", groupId)));
    snap.docs.forEach((item) => {
      const activity = item.data() as ActivityItem;
      if ((activity.createdAt ?? 0) < cutoff) deletes.push(deleteDoc(item.ref));
    });
  }
  await Promise.all(deletes);
}

export async function createGroup(group: Omit<Group, "id">): Promise<Group> {
  const ref = await addDoc(collection(db, "groups"), clean(group));
  const members = group.memberProfiles.map((member) =>
    setDoc(doc(collection(db, "groupMembers")), clean({
      groupId: ref.id,
      userId: member.id,
      name: member.name,
      email: member.email,
      upiId: member.upiId,
      avatar: member.avatar,
      joinedAt: now()
    }))
  );
  await Promise.all(members);
  return { id: ref.id, ...group };
}

export async function updateGroupName(groupId: string, name: string) {
  await updateDoc(groupRef(groupId), clean({ name, updatedAt: now() }));
}

export async function addGroupMember(
  group: Group,
  member: Pick<UserProfile, "id" | "name" | "email" | "avatar" | "upiId">
): Promise<Group> {
  const nextGroup: Group = {
    ...group,
    memberIds: [...group.memberIds, member.id],
    memberProfiles: [...group.memberProfiles, member],
    balanceSummary: { ...group.balanceSummary, [member.id]: group.balanceSummary[member.id] ?? 0 },
    updatedAt: now()
  };
  const memberRef = doc(collection(db, "groupMembers"));

  await runTransaction(db, async (transaction) => {
    transaction.update(groupRef(group.id), clean({
      memberIds: nextGroup.memberIds,
      memberProfiles: nextGroup.memberProfiles,
      balanceSummary: nextGroup.balanceSummary,
      updatedAt: nextGroup.updatedAt
    }));
    transaction.set(memberRef, clean({
      groupId: group.id,
      userId: member.id,
      name: member.name,
      email: member.email,
      upiId: member.upiId,
      avatar: member.avatar,
      joinedAt: now()
    }));
  });

  return nextGroup;
}

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(groupRef(groupId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
}

export async function fetchGroupExpenses(groupId: string): Promise<Expense[]> {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
  const snap = await getDocs(q);
  return sortByCreatedAt(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Expense)));
}

export async function fetchRecentExpenses(userId: string): Promise<Expense[]> {
  const q = query(collection(db, "expenses"), where("participantIds", "array-contains", userId));
  const snap = await getDocs(q);
  return sortByCreatedAt(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Expense))).slice(0, 10);
}

export async function addExpense(expense: Omit<Expense, "id">, group: Group, balanceSummary: Record<string, number>) {
  const ref = doc(collection(db, "expenses"));
  const groupPatch = {
    totalSpend: group.totalSpend + expense.amount,
    lastExpenseTitle: expense.title,
    lastExpenseAt: expense.createdAt,
    balanceSummary,
    updatedAt: now()
  };
  await runTransaction(db, async (transaction) => {
    transaction.set(ref, clean(expense));
    transaction.update(groupRef(group.id), groupPatch);
  });
  return { expense: { id: ref.id, ...expense }, groupPatch };
}

export async function updateExpense(
  expenseId: string,
  expense: Omit<Expense, "id">,
  groupPatch: Partial<Group>
) {
  await runTransaction(db, async (transaction) => {
    transaction.update(doc(db, "expenses", expenseId), clean(expense));
    transaction.update(groupRef(expense.groupId), clean({ ...groupPatch, updatedAt: now() }));
  });
  return { id: expenseId, ...expense };
}

export async function createSettlement(settlement: Omit<Settlement, "id">, balanceSummary: Record<string, number>) {
  const ref = doc(collection(db, "settlements"));
  await runTransaction(db, async (transaction) => {
    transaction.set(ref, clean(settlement));
    transaction.update(groupRef(settlement.groupId), { balanceSummary, lastSettlementAt: settlement.createdAt, updatedAt: now() });
  });
  return { id: ref.id, ...settlement };
}

export async function fetchDashboardSummary(userId: string): Promise<DashboardSummary> {
  const [user, activeGroups, recentExpenses] = await Promise.all([fetchUser(userId), fetchUserGroups(userId), fetchRecentExpenses(userId)]);
  const derived = dashboardTotalsFromGroups(userId, activeGroups);
  return {
    totalOwed: derived.totalOwed || user?.totalOwed || 0,
    totalReceivable: derived.totalReceivable || user?.totalReceivable || 0,
    netBalance: derived.netBalance || user?.netBalance || 0,
    activeGroups,
    recentExpenses,
    updatedAt: now()
  };
}

export function listenDashboard(userId: string, onChange: (summary: Partial<DashboardSummary>) => void): Unsubscribe {
  return onSnapshot(userRef(userId), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as UserProfile;
    onChange({
      totalOwed: data.totalOwed ?? 0,
      totalReceivable: data.totalReceivable ?? 0,
      netBalance: data.netBalance ?? 0,
      updatedAt: now()
    });
  });
}

export function listenRecentExpenses(userId: string, onChange: (expenses: Expense[]) => void): Unsubscribe {
  const q = query(collection(db, "expenses"), where("participantIds", "array-contains", userId));
  return onSnapshot(q, (snap) => onChange(sortByCreatedAt(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Expense))).slice(0, 10)));
}

export function listenUserGroups(userId: string, onChange: (groups: Group[], totals: Pick<DashboardSummary, "totalOwed" | "totalReceivable" | "netBalance">) => void): Unsubscribe {
  const q = query(collection(db, "groups"), where("memberIds", "array-contains", userId));
  return onSnapshot(q, (snap) => {
    const groups = sortByUpdatedAt(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Group)));
    onChange(groups, dashboardTotalsFromGroups(userId, groups));
  });
}

export function listenGroup(groupId: string, onChange: (group: Group | null) => void): Unsubscribe {
  return onSnapshot(groupRef(groupId), (snap) => onChange(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null));
}

export function listenGroupExpenses(groupId: string, onChange: (expenses: Expense[]) => void): Unsubscribe {
  const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
  return onSnapshot(q, (snap) => onChange(sortByCreatedAt(snap.docs.map((item) => ({ id: item.id, ...item.data() } as Expense)))));
}
