export type GroupType = "Trip" | "Home" | "Friends" | "Office" | "Couple";
export type SplitType = "equal" | "exact" | "percentage";
export type SettlementStatus = "pending" | "paid";
export type ActivityType = "group_created" | "group_renamed" | "member_added" | "expense_added" | "expense_updated" | "settlement_paid";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  upiId: string;
  avatar?: string;
  totalOwed: number;
  totalReceivable: number;
  netBalance: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  memberIds: string[];
  memberProfiles: Pick<UserProfile, "id" | "name" | "email" | "avatar" | "upiId">[];
  totalSpend: number;
  lastExpenseTitle?: string;
  lastExpenseAt?: number;
  lastSettlementAt?: number;
  balanceSummary: Record<string, number>;
  updatedAt: number;
  createdBy: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  name: string;
  email: string;
  upiId: string;
  avatar?: string;
  joinedAt: number;
}

export interface ExpenseSplit {
  userId: string;
  amount?: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  category: string;
  payerId: string;
  payerName: string;
  participantIds: string[];
  amount: number;
  splitType: SplitType;
  splits: ExpenseSplit[];
  notes?: string;
  receiptImage?: string;
  createdAt: number;
}

export interface Settlement {
  id: string;
  payerId: string;
  receiverId: string;
  groupId: string;
  amount: number;
  status: SettlementStatus;
  upiId?: string;
  createdAt: number;
}

export interface BalanceLine {
  from: string;
  to: string;
  amount: number;
}

export interface BalanceResult {
  memberBalances: Record<string, Record<string, number>>;
  netBalances: Record<string, number>;
  settlementSuggestions: BalanceLine[];
}

export interface DashboardSummary {
  totalOwed: number;
  totalReceivable: number;
  netBalance: number;
  recentExpenses: Expense[];
  activeGroups: Group[];
  updatedAt: number;
}

export interface ActivityItem {
  id: string;
  groupId: string;
  groupName: string;
  actorId?: string;
  actorName: string;
  type: ActivityType;
  sourceId?: string;
  title: string;
  description: string;
  amount?: number;
  createdAt: number;
}

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  GroupDetail: { groupId: string };
  AddExpense: { groupId?: string; expenseId?: string };
  CreateGroup: undefined;
  SettleUp: { groupId?: string; payerId?: string; receiverId?: string; amount?: number };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Groups: undefined;
  Activity: undefined;
  Profile: undefined;
};
