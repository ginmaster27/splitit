import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { StackScreenProps } from "@react-navigation/stack";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { ScreenScrollView } from "@/components/ScreenScrollView";
import { colors } from "@/constants/theme";
import { useExpenseStore } from "@/store/expenseStore";
import { useGroupStore } from "@/store/groupStore";
import { useUserStore } from "@/store/userStore";
import { RootStackParamList } from "@/types";
import { parseSplitwiseCsv, SplitwiseImportResult } from "@/utils/splitwiseCsv";

type Props = StackScreenProps<RootStackParamList, "ImportSplitwise">;

export function ImportSplitwiseScreen({ navigation }: Props) {
  const user = useUserStore((state) => state.user);
  const importSplitwiseGroup = useGroupStore((state) => state.importSplitwiseGroup);
  const setGroupExpenses = useExpenseStore((state) => state.setGroupExpenses);
  const [groupName, setGroupName] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<SplitwiseImportResult>();
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const chooseCsv = async () => {
    setError(undefined);
    try {
      const file = await pickCsvFile();
      if (!file) return;
      const text = await file.text();
      const result = parseSplitwiseCsv(text, user);
      setFileName(file.name);
      setCsvText(text);
      setParsed(result);
      if (!groupName.trim()) setGroupName(file.name.replace(/\.csv$/i, ""));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to read this CSV file.";
      setParsed(undefined);
      setCsvText("");
      setError(message);
    }
  };

  const importCsv = async () => {
    if (!groupName.trim()) {
      Alert.alert("Group name required", "Add a group name before importing.");
      return;
    }
    if (!parsed || !csvText) {
      Alert.alert("CSV required", "Choose a Splitwise CSV file first.");
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const { group, expenses } = await importSplitwiseGroup({
        name: groupName.trim(),
        members: parsed.members,
        expenses: parsed.expenses,
        currentUser: user
      });
      await setGroupExpenses(group.id, expenses);
      setCsvText("");
      setParsed(undefined);
      setFileName("");
      navigation.replace("GroupDetail", { groupId: group.id });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to import this Splitwise CSV.";
      setError(message);
      Alert.alert("Import failed", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>Import Splitwise CSV</Text>
      <Text style={styles.subhead}>Create a Splitit group from an exported Splitwise group CSV.</Text>
      <AppInput label="Group name" value={groupName} onChangeText={setGroupName} placeholder="Goa trip" />
      <AppButton title={fileName ? "Choose another CSV" : "Choose CSV"} icon="cloud-upload-outline" variant="secondary" onPress={chooseCsv} />
      {fileName ? <Text style={styles.fileName}>{fileName}</Text> : null}
      {parsed ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Preview</Text>
          <Text style={styles.previewLine}>{parsed.members.length} members detected</Text>
          <Text style={styles.previewLine}>{parsed.expenses.length} expenses ready to import</Text>
          {parsed.skippedRows ? <Text style={styles.previewLine}>{parsed.skippedRows} summary or unsupported rows skipped</Text> : null}
          <Text style={styles.mappingNote}>Members without email can be mapped after the group is created.</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton title={saving ? "Importing..." : "Import group"} icon="download-outline" onPress={importCsv} disabled={saving || !parsed} />
    </ScreenScrollView>
  );
}

async function pickCsvFile(): Promise<File | null> {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    throw new Error("CSV import is currently available on the web app.");
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      input.value = "";
      resolve(file);
    };
    input.click();
  });
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 14, backgroundColor: colors.background },
  heading: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  subhead: { color: colors.muted, lineHeight: 20 },
  fileName: { color: colors.ink, fontWeight: "800" },
  preview: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6
  },
  previewTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  previewLine: { color: colors.ink },
  mappingNote: { color: colors.muted, lineHeight: 20, marginTop: 4 },
  error: { color: colors.danger, lineHeight: 20 }
});
