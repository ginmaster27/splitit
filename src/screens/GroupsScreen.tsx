import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AppButton } from "@/components/AppButton";
import { EmptyState } from "@/components/EmptyState";
import { GroupCard } from "@/components/GroupCard";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { useGroupStore } from "@/store/groupStore";
import { useUserStore } from "@/store/userStore";

export function GroupsScreen() {
  const navigation = useNavigation<any>();
  const user = useUserStore((state) => state.user);
  const { groups, hydrateGroups } = useGroupStore();

  useEffect(() => {
    if (user) hydrateGroups(user.id);
  }, [hydrateGroups, user]);

  if (!user) return null;
  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Groups</Text>
      <AppButton title="Create group" icon="add" onPress={() => navigation.navigate("CreateGroup")} />
      {groups.length ? groups.map((group) => <GroupCard key={group.id} group={group} currentUserId={user.id} onPress={() => navigation.navigate("GroupDetail", { groupId: group.id })} />) : <EmptyState title="No active groups" body="Start by creating Turya Expense, PHF Meet Up, or any group you need." icon="people-outline" />}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: colors.background },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" }
});
