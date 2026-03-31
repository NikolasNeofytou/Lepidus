import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapScreenWeb() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>Map view</Text>
      <Text style={styles.sub}>Available on the iOS and Android app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', gap: 12 },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 14, color: '#9CA3AF' },
});
