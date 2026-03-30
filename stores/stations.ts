import { create } from 'zustand';
import { FuelType, Station } from '@/types';

interface StationsState {
  stations: Station[];
  selectedFuelType: FuelType;
  searchQuery: string;
  selectedStationId: string | null;
  setStations: (stations: Station[]) => void;
  setSelectedFuelType: (fuelType: FuelType) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStationId: (id: string | null) => void;
}

export const useStationsStore = create<StationsState>((set) => ({
  stations: [],
  selectedFuelType: 'unleaded95',
  searchQuery: '',
  selectedStationId: null,
  setStations: (stations) => set({ stations }),
  setSelectedFuelType: (selectedFuelType) => set({ selectedFuelType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedStationId: (selectedStationId) => set({ selectedStationId }),
}));
