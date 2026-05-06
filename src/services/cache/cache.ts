import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityItem, DashboardSummary, Expense, Group, UserProfile } from "@/types";

const keys = {
  session: "splitit:session",
  dashboard: (userId: string) => `splitit:${userId}:dashboard`,
  groups: (userId: string) => `splitit:${userId}:groups`,
  recentExpenses: (userId: string) => `splitit:${userId}:recentExpenses`,
  groupExpenses: (groupId: string) => `splitit:group:${groupId}:expenses`,
  activities: (userId: string) => `splitit:${userId}:activities`,
  balances: (groupId: string) => `splitit:group:${groupId}:balances`
};

async function read<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as T) : null;
}

async function write<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const cache = {
  readSession: () => read<UserProfile>(keys.session),
  writeSession: (user: UserProfile) => write(keys.session, user),
  clearSession: () => AsyncStorage.removeItem(keys.session),
  readDashboard: (userId: string) => read<DashboardSummary>(keys.dashboard(userId)),
  writeDashboard: (userId: string, summary: DashboardSummary) => write(keys.dashboard(userId), summary),
  readGroups: (userId: string) => read<Group[]>(keys.groups(userId)),
  writeGroups: (userId: string, groups: Group[]) => write(keys.groups(userId), groups),
  readRecentExpenses: (userId: string) => read<Expense[]>(keys.recentExpenses(userId)),
  writeRecentExpenses: (userId: string, expenses: Expense[]) => write(keys.recentExpenses(userId), expenses),
  readGroupExpenses: (groupId: string) => read<Expense[]>(keys.groupExpenses(groupId)),
  writeGroupExpenses: (groupId: string, expenses: Expense[]) => write(keys.groupExpenses(groupId), expenses),
  readActivities: (userId: string) => read<ActivityItem[]>(keys.activities(userId)),
  writeActivities: (userId: string, activities: ActivityItem[]) => write(keys.activities(userId), activities),
  readBalances: (groupId: string) => read<Record<string, number>>(keys.balances(groupId)),
  writeBalances: (groupId: string, balances: Record<string, number>) => write(keys.balances(groupId), balances)
};
