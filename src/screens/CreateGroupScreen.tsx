import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { groupTypes } from "@/constants/options";
import { fetchUserByEmail } from "@/services/firebase/firestore";
import { useGroupStore } from "@/store/groupStore";
import { useUserStore } from "@/store/userStore";
import { GroupType, RootStackParamList, UserProfile } from "@/types";

type Props = StackScreenProps<RootStackParamList, "CreateGroup">;

export function CreateGroupScreen({ navigation }: Props) {
  const user = useUserStore((state) => state.user);
  const createGroup = useGroupStore((state) => state.createGroup);
  const [name, setName] = useState("");
  const [type, setType] = useState<GroupType>("Friends");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  if (!user) return null;

  const addMember = async () => {
    setError(undefined);
    const trimmedName = memberName.trim();
    const trimmedEmail = memberEmail.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      setError("Add both member name and email or phone.");
      return;
    }
    if (members.some((member) => member.email === trimmedEmail)) {
      setError("This member is already added.");
      return;
    }
    try {
      const existingUser = await fetchUserByEmail(trimmedEmail);
      setMembers((current) => [
        ...current,
        {
          id: existingUser?.id ?? `guest-${trimmedEmail}`,
          name: existingUser?.name ?? trimmedName,
          email: trimmedEmail,
          avatar: existingUser?.avatar,
          upiId: existingUser?.upiId ?? `${trimmedEmail.split("@")[0]}@upi`,
          totalOwed: 0,
          totalReceivable: 0,
          netBalance: 0,
          updatedAt: Date.now()
        }
      ]);
      setMemberName("");
      setMemberEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to check this member.");
    }
  };

  const save = async () => {
    setError(undefined);
    if (!name.trim()) {
      Alert.alert("Group name required", "Add a name before creating the group.");
      return;
    }
    setSaving(true);
    try {
      const group = await createGroup({ name: name.trim(), type, members, currentUser: user });
      navigation.replace("GroupDetail", { groupId: group.id });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to create group. Please try again.";
      setError(message);
      Alert.alert("Could not create group", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Create group</Text>
      <AppInput label="Group name" value={name} onChangeText={setName} placeholder="Turya Expense" />
      <Text style={styles.label}>Group type</Text>
      <View style={styles.chips}>
        {groupTypes.map((item) => (
          <AppButton key={item} title={item} variant={item === type ? "primary" : "ghost"} onPress={() => setType(item)} style={styles.chip} />
        ))}
      </View>
      <Text style={styles.section}>Members</Text>
      <AppInput label="Member name" value={memberName} onChangeText={setMemberName} placeholder="Rahul" />
      <AppInput label="Member email or phone" value={memberEmail} onChangeText={setMemberEmail} placeholder="rahul@gmail.com" autoCapitalize="none" />
      <AppButton title="Add member" icon="person-add-outline" variant="secondary" onPress={addMember} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {members.map((member) => (
        <View key={member.id} style={styles.member}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberEmail}>{member.email}</Text>
        </View>
      ))}
      <AppButton title={saving ? "Creating..." : "Create group"} icon="checkmark" onPress={save} disabled={saving} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 16, paddingBottom: 40, gap: 12, backgroundColor: colors.background },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  label: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 40 },
  section: { color: colors.ink, fontSize: 18, fontWeight: "900", marginTop: 8 },
  member: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.line, padding: 12 },
  memberName: { color: colors.ink, fontWeight: "800" },
  memberEmail: { color: colors.muted, marginTop: 3 },
  error: { color: colors.danger, lineHeight: 20 }
});
