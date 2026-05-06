import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { BalanceCard } from "@/components/BalanceCard";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseCard } from "@/components/ExpenseCard";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { fetchUserByEmail } from "@/services/firebase/firestore";
import { useBalanceStore } from "@/store/balanceStore";
import { useExpenseStore } from "@/store/expenseStore";
import { useGroupStore } from "@/store/groupStore";
import { useUserStore } from "@/store/userStore";
import { RootStackParamList } from "@/types";
import { formatINR } from "@/utils/money";

type Props = StackScreenProps<RootStackParamList, "GroupDetail">;

export function GroupDetailScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const user = useUserStore((state) => state.user);
  const { activeGroup, groups, listenActiveGroup, refreshGroup, renameGroup, addMemberToGroup } = useGroupStore();
  const mapImportedMemberEmail = useGroupStore((state) => state.mapImportedMemberEmail);
  const { byGroup, hydrateGroupExpenses, listenExpenses, setGroupExpenses } = useExpenseStore();
  const { byGroup: balances, hydrateBalances, recompute } = useBalanceStore();
  const group = activeGroup?.id === groupId ? activeGroup : groups.find((item) => item.id === groupId);
  const expenses = byGroup[groupId] ?? [];
  const balance = balances[groupId];
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [mappingMemberId, setMappingMemberId] = useState<string>();
  const [mappingEmails, setMappingEmails] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    refreshGroup(groupId);
    hydrateGroupExpenses(groupId);
    hydrateBalances(groupId);
    const unsubscribeGroup = listenActiveGroup(groupId);
    const unsubscribeExpenses = listenExpenses(groupId);
    return () => {
      unsubscribeGroup();
      unsubscribeExpenses();
    };
  }, [groupId, hydrateBalances, hydrateGroupExpenses, listenActiveGroup, listenExpenses, refreshGroup]);

  useEffect(() => {
    recompute(groupId, expenses);
  }, [expenses, groupId, recompute]);

  useEffect(() => {
    if (group?.name) setGroupName(group.name);
  }, [group?.name]);

  if (!user || !group) return null;
  const userBalance = balance?.netBalances[user.id] ?? group.balanceSummary[user.id] ?? 0;

  const saveGroupName = async () => {
    const nextName = groupName.trim();
    setFormError(undefined);
    if (!nextName) {
      setFormError("Group name cannot be empty.");
      return;
    }
    if (nextName === group.name) {
      setIsEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await renameGroup({ groupId: group.id, name: nextName, currentUserId: user.id, currentUserName: user.name });
      setIsEditingName(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update group name.";
      setFormError(message);
      Alert.alert("Could not update group", message);
    } finally {
      setSavingName(false);
    }
  };

  const addMember = async () => {
    const trimmedName = memberName.trim();
    const trimmedEmail = memberEmail.trim().toLowerCase();
    setFormError(undefined);
    if (!trimmedName || !trimmedEmail) {
      setFormError("Add both member name and email or phone.");
      return;
    }
    if (group.memberProfiles.some((member) => member.email.toLowerCase() === trimmedEmail)) {
      setFormError("This member is already in the group.");
      return;
    }
    setAddingMember(true);
    try {
      const existingUser = await fetchUserByEmail(trimmedEmail);
      await addMemberToGroup({
        group,
        member: {
          id: existingUser?.id ?? `guest-${trimmedEmail}`,
          name: existingUser?.name ?? trimmedName,
          email: trimmedEmail,
          avatar: existingUser?.avatar,
          upiId: existingUser?.upiId ?? `${trimmedEmail.split("@")[0]}@upi`
        },
        currentUserId: user.id,
        currentUserName: user.name
      });
      setMemberName("");
      setMemberEmail("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to add member.";
      setFormError(message);
      Alert.alert("Could not add member", message);
    } finally {
      setAddingMember(false);
    }
  };

  const mapMemberEmail = async (member: (typeof group.memberProfiles)[number]) => {
    const email = mappingEmails[member.id]?.trim().toLowerCase();
    setFormError(undefined);
    if (!email) {
      setFormError(`Add an email for ${member.name}.`);
      return;
    }
    setMappingMemberId(member.id);
    try {
      const { group: savedGroup, expenses: savedExpenses } = await mapImportedMemberEmail({
        group,
        oldUserId: member.id,
        name: member.name,
        email,
        currentUserId: user.id
      });
      await setGroupExpenses(savedGroup.id, savedExpenses);
      setMappingEmails((current) => {
        const next = { ...current };
        delete next[member.id];
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to map this member.";
      setFormError(message);
      Alert.alert("Could not map member", message);
    } finally {
      setMappingMemberId(undefined);
    }
  };

  const importedMembersWithoutEmail = group.memberProfiles.filter((member) => !member.email);

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.type}>{group.type}</Text>
        {isEditingName ? (
          <View style={styles.editBlock}>
            <AppInput label="Group name" value={groupName} onChangeText={setGroupName} />
            <View style={styles.inlineActions}>
              <AppButton title={savingName ? "Saving..." : "Save"} icon="save-outline" onPress={saveGroupName} disabled={savingName} style={styles.inlineButton} />
              <AppButton
                title="Cancel"
                icon="close"
                variant="ghost"
                onPress={() => {
                  setGroupName(group.name);
                  setIsEditingName(false);
                  setFormError(undefined);
                }}
                style={styles.inlineButton}
              />
            </View>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Text style={styles.heading}>{group.name}</Text>
            <AppButton title="Edit" icon="create-outline" variant="ghost" onPress={() => setIsEditingName(true)} style={styles.editButton} />
          </View>
        )}
        <Text style={styles.meta}>
          {group.memberIds.length} members • {formatINR(group.totalSpend)} spent
        </Text>
      </View>
      <BalanceCard label="Your group balance" amount={userBalance} tone="net" />
      <View style={styles.actions}>
        <AppButton title="Add expense" icon="add" onPress={() => navigation.navigate("AddExpense", { groupId })} style={styles.action} />
        <AppButton title="Settle up" icon="checkmark-done" variant="secondary" onPress={() => navigation.navigate("SettleUp", { groupId })} style={styles.action} />
      </View>
      <Text style={styles.section}>Members</Text>
      <View style={styles.addMemberBox}>
        <AppInput label="Member name" value={memberName} onChangeText={setMemberName} placeholder="Pallavi" />
        <AppInput label="Member email or phone" value={memberEmail} onChangeText={setMemberEmail} placeholder="pallavi@gmail.com" autoCapitalize="none" />
        <AppButton title={addingMember ? "Adding..." : "Add member"} icon="person-add-outline" variant="secondary" onPress={addMember} disabled={addingMember} />
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
      </View>
      <View style={styles.members}>
        {group.memberProfiles.map((member) => (
          <View key={member.id} style={styles.member}>
            <MemberAvatar name={member.name} avatar={member.avatar} />
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={[styles.memberBalance, (balance?.netBalances[member.id] ?? 0) < 0 ? styles.negative : styles.positive]}>
              {formatINR(balance?.netBalances[member.id] ?? 0)}
            </Text>
          </View>
        ))}
      </View>
      {importedMembersWithoutEmail.length ? (
        <>
          <Text style={styles.section}>Map imported members</Text>
          <View style={styles.mappingBox}>
            <Text style={styles.mappingHelp}>Splitwise exports names only. Add the correct email for each imported person to link them to a Splitit user.</Text>
            {importedMembersWithoutEmail.map((member) => (
              <View key={member.id} style={styles.mappingRow}>
                <View style={styles.mappingName}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>Imported from Splitwise</Text>
                </View>
                <AppInput
                  label="Email"
                  value={mappingEmails[member.id] ?? ""}
                  onChangeText={(value) => setMappingEmails((current) => ({ ...current, [member.id]: value }))}
                  placeholder="name@email.com"
                  autoCapitalize="none"
                  style={styles.mappingInput}
                />
                <AppButton
                  title={mappingMemberId === member.id ? "Saving..." : "Map"}
                  icon="link-outline"
                  variant="secondary"
                  onPress={() => mapMemberEmail(member)}
                  disabled={Boolean(mappingMemberId)}
                  style={styles.mapButton}
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.section}>Settlement suggestions</Text>
      {balance?.settlementSuggestions.length ? (
        balance.settlementSuggestions.map((item) => {
          const from = group.memberProfiles.find((member) => member.id === item.from);
          const to = group.memberProfiles.find((member) => member.id === item.to);
          return (
            <View key={`${item.from}-${item.to}-${item.amount}`} style={styles.suggestion}>
              <Text style={styles.suggestionText}>
                {from?.name} pays {to?.name}
              </Text>
              <Text style={styles.suggestionAmount}>{formatINR(item.amount)}</Text>
              <AppButton title="Pay" icon="arrow-forward" variant="ghost" onPress={() => navigation.navigate("SettleUp", { groupId, payerId: item.from, receiverId: item.to, amount: item.amount })} style={styles.payButton} />
            </View>
          );
        })
      ) : (
        <EmptyState title="All settled" body="No one owes anyone in this group right now." icon="checkmark-circle-outline" />
      )}
      <Text style={styles.section}>Expenses</Text>
      {expenses.length ? (
        expenses.map((expense) => {
          const canEdit = !group.lastSettlementAt || expense.createdAt > group.lastSettlementAt;
          return <ExpenseCard key={expense.id} expense={expense} canEdit={canEdit} onEdit={() => canEdit && navigation.navigate("AddExpense", { groupId, expenseId: expense.id })} />;
        })
      ) : (
        <EmptyState title="No expenses" body="Add the first group expense to calculate balances." icon="receipt-outline" />
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 16, paddingBottom: 40, gap: 12, backgroundColor: colors.background },
  header: { gap: 5 },
  type: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  meta: { color: colors.muted },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  editButton: { minHeight: 38, paddingHorizontal: 12 },
  editBlock: { gap: 10 },
  inlineActions: { flexDirection: "row", gap: 8 },
  inlineButton: { flex: 1, minHeight: 42 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  section: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 8 },
  addMemberBox: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 10 },
  members: { gap: 8 },
  member: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  memberName: { flex: 1, color: colors.ink, fontWeight: "800" },
  memberEmail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  memberBalance: { fontWeight: "900" },
  mappingBox: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 12 },
  mappingHelp: { color: colors.muted, lineHeight: 20 },
  mappingRow: { gap: 8 },
  mappingName: { gap: 2 },
  mappingInput: { marginBottom: 0 },
  mapButton: { alignSelf: "flex-start", minHeight: 40 },
  positive: { color: colors.success },
  negative: { color: colors.danger },
  suggestion: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 8 },
  suggestionText: { color: colors.ink, fontWeight: "800" },
  suggestionAmount: { color: colors.primary, fontSize: 20, fontWeight: "900" },
  payButton: { alignSelf: "flex-start", minHeight: 38 },
  error: { color: colors.danger, lineHeight: 20 }
});
