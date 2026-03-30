import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settings';
import { useFavoritesStore } from '@/stores/favorites';
import { FuelTypeSelector } from '@/components/station/FuelTypeSelector';

export default function SettingsScreen() {
  const { defaultFuelType, setDefaultFuelType } = useSettingsStore();
  const { favoriteIds } = useFavoritesStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fuel Preference</Text>
        <FuelTypeSelector selected={defaultFuelType} onSelect={setDefaultFuelType} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Car</Text>
        <TouchableOpacity style={styles.row} activeOpacity={0.7}>
          <View style={[styles.rowIcon, { backgroundColor: '#F0FDF4' }]}>
            <FontAwesome name="car" size={16} color="#16a34a" />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Set up car profile</Text>
            <Text style={styles.rowSub}>For trip cost estimates</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#D1D5DB" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved</Text>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#FEF2F2' }]}>
            <FontAwesome name="heart" size={14} color="#DC2626" />
          </View>
          <Text style={styles.rowBody}>
            <Text style={styles.rowTitle}>Favorite stations </Text>
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{favoriteIds.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutName}>Lepidus</Text>
          <Text style={styles.aboutDesc}>Cyprus Gas Station Finder</Text>
          <View style={styles.aboutDivider} />
          <Text style={styles.aboutSource}>Data from the Cyprus Fuel Prices Observatory</Text>
          <Text style={styles.aboutVersion}>v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 100 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: -0.2,
  },
  rowSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  aboutCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
  },
  aboutName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: -0.5,
  },
  aboutDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  aboutSource: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  aboutVersion: {
    fontSize: 11,
    color: '#D1D5DB',
    marginTop: 8,
  },
});
