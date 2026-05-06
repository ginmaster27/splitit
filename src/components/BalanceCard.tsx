import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { formatINR } from "@/utils/money";

interface Props {
  label: string;
  amount: number;
  tone?: "owed" | "receivable" | "net";
}

export function BalanceCard({ label, amount, tone = "net" }: Props) {
  const positive = amount >= 0;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, tone === "owed" && styles.owed, tone === "receivable" && styles.receivable, tone === "net" && (positive ? styles.receivable : styles.owed)]}>
        {formatINR(Math.abs(amount))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 104,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  amount: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 8 },
  owed: { color: colors.danger },
  receivable: { color: colors.success }
});
