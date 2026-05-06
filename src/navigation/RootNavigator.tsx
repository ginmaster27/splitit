import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { ActivityScreen } from "@/screens/ActivityScreen";
import { AddExpenseScreen } from "@/screens/AddExpenseScreen";
import { AuthScreen } from "@/screens/AuthScreen";
import { CreateGroupScreen } from "@/screens/CreateGroupScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { GroupDetailScreen } from "@/screens/GroupDetailScreen";
import { GroupsScreen } from "@/screens/GroupsScreen";
import { ImportSplitwiseScreen } from "@/screens/ImportSplitwiseScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { SettleUpScreen } from "@/screens/SettleUpScreen";
import { useUserStore } from "@/store/userStore";
import { MainTabParamList, RootStackParamList } from "@/types";

const Stack = createStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? Math.max(insets.bottom, 12) : Math.max(insets.bottom, 8);

  return (
    <Tabs.Navigator
      sceneContainerStyle={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", paddingBottom: 0 },
        tabBarItemStyle: { paddingTop: 8, paddingBottom: 4 },
        tabBarStyle: {
          height: 62 + bottomInset,
          paddingTop: 6,
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          backgroundColor: colors.surface,
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 12
        },
        tabBarIcon: ({ color, focused }) => {
          const icon =
            route.name === "Dashboard"
              ? focused
                ? "home"
                : "home-outline"
              : route.name === "Groups"
                ? focused
                  ? "people"
                  : "people-outline"
                : route.name === "Activity"
                  ? focused
                    ? "notifications"
                    : "notifications-outline"
                  : focused
                    ? "person"
                    : "person-outline";
          return <Ionicons name={icon} color={color} size={24} />;
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
          <Stack.Screen name="ImportSplitwise" component={ImportSplitwiseScreen} options={{ title: "Import Splitwise" }} />
          <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ title: "Settle up" }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
