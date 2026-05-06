import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

interface Props {
  name: string;
  avatar?: string;
  size?: number;
}

export function MemberAvatar({ name, avatar, size = 36 }: Props) {
  if (avatar) return <Image source={{ uri: avatar }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.36) }]}>{name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.line },
  fallback: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.primary, fontWeight: "800" }
});
