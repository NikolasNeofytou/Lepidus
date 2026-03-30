import { create } from 'zustand';
import { CarProfile, FuelType, SortMode } from '@/types';

interface SettingsState {
  defaultFuelType: FuelType;
  sortMode: SortMode;
  carProfile: CarProfile | null;
  setDefaultFuelType: (fuelType: FuelType) => void;
  setSortMode: (mode: SortMode) => void;
  setCarProfile: (profile: CarProfile | null) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultFuelType: 'unleaded95',
  sortMode: 'price',
  carProfile: null,
  setDefaultFuelType: (defaultFuelType) => set({ defaultFuelType }),
  setSortMode: (sortMode) => set({ sortMode }),
  setCarProfile: (carProfile) => set({ carProfile }),
}));
