import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";

export function Loader() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: "center", justifyContent: "center" }
});
