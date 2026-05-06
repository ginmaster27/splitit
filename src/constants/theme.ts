import { DefaultTheme } from "@react-navigation/native";

export const colors = {
  background: "#f2f2f7",
  surface: "#ffffff",
  ink: "#111827",
  muted: "#6b7280",
  line: "#e5e7eb",
  primary: "#096b5a",
  primarySoft: "#dff4ef",
  accent: "#e66b2e",
  accentSoft: "#fff0e7",
  danger: "#c0392b",
  success: "#138a4d",
  tab: "#f1f5f4"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
};

export const theme = {
  colors,
  spacing,
  navigation: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      primary: colors.primary,
      card: colors.surface,
      text: colors.ink,
      border: colors.line
    }
  }
};
