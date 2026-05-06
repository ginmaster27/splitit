import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { createActivity } from "@/services/firebase/firestore";
import { useExpenseStore } from "@/store/expenseStore";
import { useGroupStore } from "@/store/groupStore";
import { useSettlementStore } from "@/store/settlementStore";
import { useBalanceStore } from "@/store/balanceStore";
import { RootStackParamList } from "@/types";
import { formatINR, toRupees } from "@/utils/money";

type Props = NativeStackScreenProps<RootStackParamList, "SettleUp">;

export function SettleUpScreen({ route, navigation }: Props) {
  const groups = useGroupStore((state) => state.groups);
  const patchGroup = useGroupStore((state) => state.patchGroup);
  const byGroup = useExpenseStore((state) => state.byGroup);
  const settle = useSettlementStore((state) => state.settle);
  const recompute = useBalanceStore((state) => state.recompute);
  const group = groups.find((item) => item.id === route.params?.groupId) ?? groups[0];
  const [groupId, setGroupId] = useState(group?.id ?? "");
  const selectedGroup = groups.find((item) => item.id === groupId);
  const [payerId, setPayerId] = useState(route.params?.payerId ?? "");
  const [receiverId, setReceiverId] = useState(route.params?.receiverId ?? "");
  const [amount, setAmount] = useState(route.params?.amount ? String(route.params.amount) : "");
  const [upiId, setUpiId] = useState("");

  const members = selectedGroup?.memberProfiles ?? [];

  const save = async () => {
    if (!selectedGroup || !payerId || !receiverId || !toRupees(amount)) {
      Alert.alert("Settlement details missing", "Choose payer, receiver, and settlement amount.");
      return;
    }
    const receiver = members.find((member) => member.id === receiverId);
    const payer = members.find((member) => member.id === payerId);
    const expenses = byGroup[selectedGroup.id] ?? [];
    const created = await settle({ groupId: selectedGroup.id, payerId, receiverId, amount: toRupees(amount), upiId: upiId || receiver?.upiId }, expenses);
    await createActivity({
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      actorId: payerId,
      actorName: payer?.name ?? "Someone",
      type: "settlement_paid",
      sourceId: created.id,
      title: "Settlement paid",
      description: `${payer?.name ?? "Someone"} paid ${receiver?.name ?? "someone"}`,
      amount: created.amount,
      createdAt: created.createdAt
    });
    const balances = await recompute(selectedGroup.id, expenses, [created]);
    patchGroup(selectedGroup.id, { balanceSummary: balances.netBalances, lastSettlementAt: created.createdAt, updatedAt: Date.now() });
    Alert.alert("Payment marked paid", "UPI payment has been recorded in Splitit.");
    navigation.goBack();
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Settle up</Text>
      <Text style={styles.label}>Group</Text>
      <View style={styles.chips}>
        {groups.map((item) => (
          <AppButton key={item.id} title={item.name} variant={item.id === groupId ? "primary" : "ghost"} onPress={() => setGroupId(item.id)} style={styles.chip} />
        ))}
      </View>
      <Text style={styles.label}>Payer</Text>
      <View style={styles.chips}>{members.map((member) => <AppButton key={member.id} title={member.name} variant={member.id === payerId ? "primary" : "ghost"} onPress={() => setPayerId(member.id)} style={styles.chip} />)}</View>
      <Text style={styles.label}>Receiver</Text>
      <View style={styles.chips}>{members.map((member) => <AppButton key={member.id} title={member.name} variant={member.id === receiverId ? "primary" : "ghost"} onPress={() => setReceiverId(member.id)} style={styles.chip} />)}</View>
      <AppInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="500" />
      <AppInput label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder={members.find((member) => member.id === receiverId)?.upiId ?? "receiver@upi"} autoCapitalize="none" />
      <View style={styles.upiBox}>
        <Text style={styles.upiText}>UPI placeholder</Text>
        <Text style={styles.upiAmount}>{formatINR(toRupees(amount))}</Text>
      </View>
      <AppButton title="Mark as paid" icon="checkmark-done" onPress={save} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: colors.background },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  label: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40 },
  upiBox: { backgroundColor: colors.accentSoft, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: "#ffd4be" },
  upiText: { color: colors.accent, fontWeight: "900" },
  upiAmount: { color: colors.ink, fontSize: 24, fontWeight: "900", marginTop: 6 }
});
