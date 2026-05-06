import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

interface Props {
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function EmptyState({ title, body, icon = "file-tray-outline" }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", padding: 28, gap: 8 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  body: { color: colors.muted, textAlign: "center", lineHeight: 20 }
});
