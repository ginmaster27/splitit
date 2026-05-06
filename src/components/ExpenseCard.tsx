import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { colors } from "@/constants/theme";
import { Expense } from "@/types";
import { formatDate } from "@/utils/date";
import { formatINR } from "@/utils/money";

interface Props {
  expense: Expense;
  canEdit?: boolean;
  onEdit?: () => void;
}

export function ExpenseCard({ expense, canEdit = false, onEdit }: Props) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.title}>{expense.title}</Text>
        <Text style={styles.meta}>
          {expense.category} • Paid by {expense.payerName} • {formatDate(expense.createdAt)}
        </Text>
      </View>
      <View style={styles.trailing}>
        <Text style={styles.amount}>{formatINR(expense.amount)}</Text>
        {onEdit ? (
          canEdit ? (
            <AppButton title="Edit" icon="create-outline" variant="ghost" onPress={onEdit} style={styles.editButton} />
          ) : (
            <Text style={styles.locked}>Settled</Text>
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 1
  },
  title: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 5 },
  trailing: { alignItems: "flex-end", gap: 8 },
  amount: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  editButton: { minHeight: 34, paddingHorizontal: 10 },
  locked: { color: colors.muted, fontSize: 12, fontWeight: "800" }
});
