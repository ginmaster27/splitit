import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { MemberAvatar } from "@/components/MemberAvatar";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";

export function ProfileScreen() {
  const { user, saveProfile, logout } = useUserStore();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [upiId, setUpiId] = useState(user?.upiId ?? "");

  if (!user) return null;

  const onSave = async () => {
    await saveProfile({ name, phone, upiId });
    Alert.alert("Profile saved", "Your Splitit profile is up to date.");
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <MemberAvatar name={user.name} avatar={user.avatar} size={72} />
        <Text style={styles.heading}>{user.name}</Text>
        <Text style={styles.email}>{user.email || user.phone}</Text>
      </View>
      <AppInput label="Name" value={name} onChangeText={setName} />
      <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <AppInput label="Email" value={user.email} editable={false} />
      <AppInput label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="name@upi" autoCapitalize="none" />
      <AppButton title="Save profile" icon="save-outline" onPress={onSave} />
      <AppButton title="Sign out" icon="log-out-outline" variant="ghost" onPress={logout} />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, gap: 14, backgroundColor: colors.background },
  header: { alignItems: "center", gap: 8, marginBottom: 6 },
  heading: { color: colors.ink, fontSize: 24, fontWeight: "900" },
  email: { color: colors.muted }
});
