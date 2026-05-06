import { Text, TextInput, TextInputProps, View } from "react-native";
import { StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function AppInput({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#9aa4b2" style={[styles.input, style]} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 15
  },
  error: { color: colors.danger, fontSize: 12 }
});
