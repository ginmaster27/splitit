import { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { categories, splitTypes } from "@/constants/options";
import { useExpenseStore } from "@/store/expenseStore";
import { useGroupStore } from "@/store/groupStore";
import { useBalanceStore } from "@/store/balanceStore";
import { useUserStore } from "@/store/userStore";
import { ExpenseSplit, RootStackParamList, SplitType } from "@/types";
import { splitExpense } from "@/utils/balanceEngine";
import { toRupees } from "@/utils/money";

type Props = StackScreenProps<RootStackParamList, "AddExpense">;

export function AddExpenseScreen({ route, navigation }: Props) {
  const user = useUserStore((state) => state.user);
  const groups = useGroupStore((state) => state.groups);
  const patchGroup = useGroupStore((state) => state.patchGroup);
  const expensesByGroup = useExpenseStore((state) => state.byGroup);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const updateExpense = useExpenseStore((state) => state.updateExpense);
  const refreshGroupExpenses = useExpenseStore((state) => state.refreshGroupExpenses);
  const recompute = useBalanceStore((state) => state.recompute);
  const expenseId = route.params?.expenseId;
  const defaultGroup = groups.find((item) => item.id === route.params?.groupId) ?? groups[0];
  const [groupId, setGroupId] = useState(defaultGroup?.id ?? "");
  const group = groups.find((item) => item.id === groupId);
  const editingExpense = expenseId ? expensesByGroup[groupId]?.find((expense) => expense.id === expenseId) : undefined;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState(user?.id ?? "");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [category, setCategory] = useState("Food");
  const [notes, setNotes] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const members = group?.memberProfiles ?? [];
  const participantIds = selectedIds.length ? selectedIds : members.map((member) => member.id);
  const payer = members.find((member) => member.id === payerId) ?? members[0];
  const splits: ExpenseSplit[] = useMemo(
    () =>
      participantIds.map((id) => ({
        userId: id,
        amount: splitType === "exact" ? toRupees(splitValues[id] ?? "0") : undefined,
        percentage: splitType === "percentage" ? toRupees(splitValues[id] ?? "0") : undefined
      })),
    [participantIds, splitType, splitValues]
  );

  useEffect(() => {
    if (!groupId && defaultGroup?.id) setGroupId(defaultGroup.id);
  }, [defaultGroup?.id, groupId]);

  useEffect(() => {
    if (expenseId && groupId && !editingExpense) {
      refreshGroupExpenses(groupId);
    }
  }, [editingExpense, expenseId, groupId, refreshGroupExpenses]);

  useEffect(() => {
    if (!editingExpense) return;
    setTitle(editingExpense.title);
    setAmount(String(editingExpense.amount));
    setPayerId(editingExpense.payerId);
    setSplitType(editingExpense.splitType);
    setCategory(editingExpense.category);
    setNotes(editingExpense.notes ?? "");
    setSelectedIds(editingExpense.participantIds);
    setSplitValues(
      Object.fromEntries(
        editingExpense.splits.map((split) => [
          split.userId,
          editingExpense.splitType === "percentage" ? String(split.percentage ?? "") : String(split.amount ?? "")
        ])
      )
    );
  }, [editingExpense]);

  if (!user) return null;

  const toggleParticipant = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const save = async () => {
    if (!group || !payer || !title.trim() || !toRupees(amount)) {
      Alert.alert("Expense details missing", "Choose a group and add title, payer, and amount.");
      return;
    }
    if (editingExpense && group.lastSettlementAt && editingExpense.createdAt <= group.lastSettlementAt) {
      Alert.alert("Expense is settled", "This expense was included in a settlement and can no longer be edited.");
      return;
    }
    setSaving(true);
    const expenseInput = {
      groupId: group.id,
      title: title.trim(),
      amount: toRupees(amount),
      payerId: payer.id,
      payerName: payer.name,
      participantIds,
      splitType,
      splits: splitExpense({ amount: toRupees(amount), participantIds, splitType, splits }),
      category,
      notes,
      createdAt: editingExpense?.createdAt ?? Date.now()
    };
    try {
      if (editingExpense) {
        const { groupPatch } = await updateExpense(editingExpense.id, expenseInput, group);
        const expenses = (expensesByGroup[group.id] ?? []).map((expense) => (expense.id === editingExpense.id ? { id: editingExpense.id, ...expenseInput } : expense));
        const balances = await recompute(group.id, expenses);
        patchGroup(group.id, { ...groupPatch, balanceSummary: balances.netBalances, updatedAt: Date.now() });
      } else {
        const created = await addExpense(expenseInput, group);
        const expenses = [created, ...(expensesByGroup[group.id] ?? [])];
        const balances = await recompute(group.id, expenses);
        patchGroup(group.id, {
          totalSpend: group.totalSpend + created.amount,
          lastExpenseTitle: created.title,
          lastExpenseAt: created.createdAt,
          balanceSummary: balances.netBalances,
          updatedAt: Date.now()
        });
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("Could not save expense", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>{editingExpense ? "Edit expense" : "Add expense"}</Text>
      <Text style={styles.label}>Group</Text>
      <View style={styles.chips}>
        {groups.map((item) => (
          <AppButton key={item.id} title={item.name} variant={item.id === groupId ? "primary" : "ghost"} onPress={() => !editingExpense && setGroupId(item.id)} disabled={Boolean(editingExpense)} style={styles.chip} />
        ))}
      </View>
      <AppInput label="Title" value={title} onChangeText={setTitle} placeholder="Dinner" />
      <AppInput label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="2400" />
      <Text style={styles.label}>Payer</Text>
      <View style={styles.chips}>
        {members.map((member) => (
          <AppButton key={member.id} title={member.name} variant={member.id === payerId ? "primary" : "ghost"} onPress={() => setPayerId(member.id)} style={styles.chip} />
        ))}
      </View>
      <Text style={styles.label}>Participants</Text>
      <View style={styles.chips}>
        {members.map((member) => (
          <AppButton key={member.id} title={member.name} variant={participantIds.includes(member.id) ? "secondary" : "ghost"} onPress={() => toggleParticipant(member.id)} style={styles.chip} />
        ))}
      </View>
      <Text style={styles.label}>Split type</Text>
      <View style={styles.chips}>
        {splitTypes.map((item) => (
          <AppButton key={item} title={item} variant={item === splitType ? "primary" : "ghost"} onPress={() => setSplitType(item)} style={styles.chip} />
        ))}
      </View>
      {splitType !== "equal"
        ? participantIds.map((id) => (
            <AppInput
              key={id}
              label={`${members.find((member) => member.id === id)?.name ?? "Member"} ${splitType === "exact" ? "amount" : "percentage"}`}
              value={splitValues[id] ?? ""}
              onChangeText={(value) => setSplitValues((current) => ({ ...current, [id]: value }))}
              keyboardType="numeric"
            />
          ))
        : null}
      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {categories.map((item) => (
          <AppButton key={item} title={item} variant={item === category ? "primary" : "ghost"} onPress={() => setCategory(item)} style={styles.chip} />
        ))}
      </View>
      <AppInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
      <AppButton title={saving ? "Saving..." : editingExpense ? "Update expense" : "Save expense"} icon="receipt-outline" onPress={save} disabled={saving} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: colors.background },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  label: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40 }
});
