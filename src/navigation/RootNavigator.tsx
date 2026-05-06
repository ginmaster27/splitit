import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { ActivityScreen } from "@/screens/ActivityScreen";
import { AddExpenseScreen } from "@/screens/AddExpenseScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { CreateGroupScreen } from "@/screens/CreateGroupScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { GroupDetailScreen } from "@/screens/GroupDetailScreen";
import { GroupsScreen } from "@/screens/GroupsScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { SettleUpScreen } from "@/screens/SettleUpScreen";
import { useUserStore } from "@/store/userStore";
import { MainTabParamList, RootStackParamList } from "@/types";

const Stack = createStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tabs.Navigator
      sceneContainerStyle={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.line, backgroundColor: colors.surface },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === "Dashboard"
              ? "home-outline"
              : route.name === "Groups"
                ? "people-outline"
                : route.name === "Activity"
                  ? "notifications-outline"
                  : "person-outline";
          return <Ionicons name={icon} color={color} size={size} />;
        }
      })}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Groups" component={GroupsScreen} />
      <Tabs.Screen name="Activity" component={ActivityScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const user = useUserStore((state) => state.user);
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.ink, cardStyle: { flex: 1, minHeight: 0, backgroundColor: colors.background } }}>
      {user ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: "Group" }} />
          <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: "Add expense" }} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: "Create group" }} />
          <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ title: "Settle up" }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
