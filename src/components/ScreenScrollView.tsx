import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export function ScreenScrollView({ contentContainerStyle, style, ...props }: ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const safeTop = Platform.OS === "web" ? Math.max(insets.top, 28) : insets.top + 8;
  const safeBottom = Platform.OS === "web" ? Math.max(insets.bottom, 24) : insets.bottom + 12;

  return (
    <ScrollView
      {...props}
      style={[styles.scroll, Platform.OS === "web" && webScrollStyle, style]}
      contentContainerStyle={[styles.content, { paddingTop: safeTop, paddingBottom: safeBottom }, contentContainerStyle]}
      keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? "handled"}
      showsVerticalScrollIndicator={props.showsVerticalScrollIndicator ?? true}
    />
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background
  },
  content: {
    flexGrow: 1
  }
});

const webScrollStyle = {
  height: "100%",
  maxHeight: "100vh",
  overflowY: "auto"
} as never;
