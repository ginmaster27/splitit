import { Platform, ScrollView, StyleSheet, type ScrollViewProps } from "react-native";
import { colors } from "@/constants/theme";

export function ScreenScrollView({ contentContainerStyle, style, ...props }: ScrollViewProps) {
  return (
    <ScrollView
      {...props}
      style={[styles.scroll, Platform.OS === "web" && webScrollStyle, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
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
