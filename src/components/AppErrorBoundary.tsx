import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";

interface State {
  error?: Error;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Splitit could not start</Text>
        <Text style={styles.message}>{this.state.error.message}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "900", marginBottom: 10 },
  message: { color: colors.danger, textAlign: "center", lineHeight: 20, maxWidth: 460 }
});
