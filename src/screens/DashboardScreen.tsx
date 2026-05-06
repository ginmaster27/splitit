import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppButton } from "@/components/AppButton";
import { BalanceCard } from "@/components/BalanceCard";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseCard } from "@/components/ExpenseCard";
import { GroupCard } from "@/components/GroupCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { useDashboardStore } from "@/store/dashboardStore";
import { useGroupStore } from "@/store/groupStore";
import { useUserStore } from "@/store/userStore";

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const user = useUserStore((state) => state.user);
  const { summary, hydrateDashboard, listen } = useDashboardStore();
  const hydrateGroups = useGroupStore((state) => state.hydrateGroups);

  useEffect(() => {
    if (!user) return;
    hydrateDashboard(user.id);
    hydrateGroups(user.id);
    const unsubscribers = listen(user.id);
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [hydrateDashboard, hydrateGroups, listen, user]);

  if (!user) return null;
  const groups = summary?.activeGroups ?? [];
  const recentExpenses = summary?.recentExpenses ?? [];

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.hello}>Hi {user.name.split(" ")[0]}</Text>
      <Text style={styles.heading}>Your balances</Text>
      <View style={styles.balanceRow}>
        <BalanceCard label="You owe" amount={summary?.totalOwed ?? user.totalOwed} tone="owed" />
        <BalanceCard label="You are owed" amount={summary?.totalReceivable ?? user.totalReceivable} tone="receivable" />
      </View>
      <BalanceCard label="Net balance" amount={summary?.netBalance ?? user.netBalance} tone="net" />
      <View style={styles.actions}>
        <AppButton title="Add" icon="add" onPress={() => navigation.navigate("AddExpense", {})} style={styles.action} />
        <AppButton title="Group" icon="people" variant="secondary" onPress={() => navigation.navigate("CreateGroup")} style={styles.action} />
        <AppButton title="Settle" icon="checkmark-done" variant="ghost" onPress={() => navigation.navigate("SettleUp", {})} style={styles.action} />
      </View>
      <Text style={styles.section}>Active groups</Text>
      {groups.length ? groups.slice(0, 3).map((group) => <GroupCard key={group.id} group={group} currentUserId={user.id} onPress={() => navigation.navigate("GroupDetail", { groupId: group.id })} />) : <EmptyState title="No groups yet" body="Create a group for your next trip, home, office, or dinner plan." icon="people-outline" />}
      <Text style={styles.section}>Recent expenses</Text>
      {recentExpenses.length ? recentExpenses.map((expense) => <ExpenseCard key={expense.id} expense={expense} />) : <EmptyState title="No expenses yet" body="Add an expense to see activity and balances instantly." icon="receipt-outline" />}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 14, backgroundColor: colors.background },
  hello: { color: colors.muted, fontSize: 15, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 30, fontWeight: "900", letterSpacing: 0 },
  balanceRow: { flexDirection: "row", gap: 12 },
  actions: { flexDirection: "row", gap: 10, marginVertical: 8 },
  action: { flex: 1 },
  section: { color: colors.ink, fontSize: 19, fontWeight: "900", marginTop: 12, letterSpacing: 0 }
});
