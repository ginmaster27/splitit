import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/AppButton";
import { colors } from "@/constants/theme";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/services/firebase/config";
import { useUserStore } from "@/store/userStore";

export function AuthScreen() {
  const { login, loading, error } = useUserStore();
  return (
    <View style={styles.screen}>
      <View style={styles.brandMark}>
        <Text style={styles.brandGlyph}>₹</Text>
      </View>
      <Text style={styles.title}>Splitit</Text>
      <Text style={styles.subtitle}>Split trips, rent, dinners, and UPI settlements with people you trust.</Text>
      {!isFirebaseConfigured ? <Text style={styles.notice}>{firebaseSetupMessage}</Text> : null}
      <AppButton title={loading ? "Signing in..." : "Continue with Google"} icon="logo-google" onPress={login} disabled={loading} style={styles.button} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  brandMark: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  brandGlyph: { color: "#fff", fontSize: 40, fontWeight: "900" },
  title: { color: colors.ink, fontSize: 38, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 16, textAlign: "center", lineHeight: 24, marginTop: 10, maxWidth: 360 },
  notice: { color: colors.accent, fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 16, maxWidth: 380 },
  button: { width: "100%", maxWidth: 360, marginTop: 28 },
  error: { color: colors.danger, marginTop: 14, textAlign: "center" }
});
