import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState } from "@/components/EmptyState";
import { Loader } from "@/components/Loader";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { useActivityStore } from "@/store/activityStore";
import { useGroupStore } from "@/store/groupStore";
import { useUserStore } from "@/store/userStore";
import { ActivityItem } from "@/types";
import { formatDate } from "@/utils/date";
import { formatINR } from "@/utils/money";

export function ActivityScreen() {
  const user = useUserStore((state) => state.user);
  const { groups, hydrateGroups } = useGroupStore();
  const { activities, loading, error, hydrateActivities } = useActivityStore();

  useEffect(() => {
    if (user) hydrateGroups(user.id);
  }, [hydrateGroups, user]);

  useEffect(() => {
    if (user) hydrateActivities(user.id, groups);
  }, [groups, hydrateActivities, user]);

  if (!user) return null;

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Activity</Text>
      <Text style={styles.subhead}>Last 30 days across your groups</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && !activities.length ? <Loader /> : null}
      {activities.length ? (
        activities.map((activity) => <ActivityRow key={activity.id} activity={activity} />)
      ) : !loading ? (
        <EmptyState title="No recent activity" body="Group changes, expenses, edits, and settlements will appear here." icon="notifications-outline" />
      ) : null}
    </ScreenScrollView>
  );
}

function ActivityRow({ activity }: { activity: ActivityItem }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconFor(activity.type)} size={20} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title}>{activity.title}</Text>
          {activity.amount ? <Text style={styles.amount}>{formatINR(activity.amount)}</Text> : null}
        </View>
        <Text style={styles.description}>{activity.description}</Text>
        <Text style={styles.meta}>
          {activity.groupName} • {formatDate(activity.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function iconFor(type: ActivityItem["type"]): keyof typeof Ionicons.glyphMap {
  const icons: Record<ActivityItem["type"], keyof typeof Ionicons.glyphMap> = {
    group_created: "people-outline",
    group_renamed: "create-outline",
    member_added: "person-add-outline",
    expense_added: "receipt-outline",
    expense_updated: "pencil-outline",
    settlement_paid: "checkmark-done-outline"
  };
  return icons[type];
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 40, gap: 12, backgroundColor: colors.background },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subhead: { color: colors.muted, marginTop: -6 },
  card: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: "row", gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 4 },
  row: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  title: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: "900" },
  description: { color: colors.ink, lineHeight: 20 },
  meta: { color: colors.muted, fontSize: 12 },
  amount: { color: colors.primary, fontWeight: "900" },
  error: { color: colors.danger, lineHeight: 20 }
});
