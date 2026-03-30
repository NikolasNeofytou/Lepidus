import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FuelType } from '@/types';
import { FUEL_TYPE_LABELS } from '@/utils/constants';

interface FuelTypeSelectorProps {
  selected: FuelType;
  onSelect: (fuelType: FuelType) => void;
}

const FUEL_TYPES: FuelType[] = ['unleaded95', 'unleaded98', 'diesel', 'kerosene', 'lpg'];

export function FuelTypeSelector({ selected, onSelect }: FuelTypeSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FUEL_TYPES.map((type) => {
        const isSelected = selected === type;
        return (
          <TouchableOpacity
            key={type}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(type)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {FUEL_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  labelSelected: {
    color: '#fff',
  },
});
