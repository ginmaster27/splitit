import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { Group } from "@/types";
import { formatDate } from "@/utils/date";
import { formatINR } from "@/utils/money";

interface Props {
  group: Group;
  currentUserId: string;
  onPress: () => void;
}

export function GroupCard({ group, currentUserId, onPress }: Props) {
  const balance = group.balanceSummary[currentUserId] ?? 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Ionicons name={iconFor(group.type)} size={22} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.title}>{group.name}</Text>
          <Text style={[styles.balance, balance < 0 ? styles.negative : styles.positive]}>{formatINR(balance)}</Text>
        </View>
        <Text style={styles.meta}>
          {group.memberIds.length} members • {formatINR(group.totalSpend)} spent
        </Text>
        <Text style={styles.meta}>{group.lastExpenseTitle ?? "No expenses yet"} • {formatDate(group.lastExpenseAt ?? group.updatedAt)}</Text>
      </View>
    </Pressable>
  );
}

function iconFor(type: Group["type"]): keyof typeof Ionicons.glyphMap {
  const icons: Record<Group["type"], keyof typeof Ionicons.glyphMap> = {
    Trip: "airplane-outline",
    Home: "home-outline",
    Friends: "people-outline",
    Office: "briefcase-outline",
    Couple: "heart-outline"
  };
  return icons[type];
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line
  },
  pressed: { opacity: 0.8 },
  iconWrap: { width: 42, height: 42, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 5 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  title: { flex: 1, color: colors.ink, fontWeight: "800", fontSize: 16 },
  balance: { fontWeight: "800" },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  meta: { color: colors.muted, fontSize: 13 }
});
