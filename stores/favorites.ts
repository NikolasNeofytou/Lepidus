import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'lepidus_favorites';

interface FavoritesState {
  favoriteIds: string[];
  loaded: boolean;
  toggleFavorite: (stationId: string) => void;
  isFavorite: (stationId: string) => boolean;
  loadFavorites: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favoriteIds: [],
  loaded: false,

  toggleFavorite: (stationId) => {
    const current = get().favoriteIds;
    const next = current.includes(stationId)
      ? current.filter((id) => id !== stationId)
      : [...current, stationId];
    set({ favoriteIds: next });
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  },

  isFavorite: (stationId) => get().favoriteIds.includes(stationId),

  loadFavorites: async () => {
    const stored = await AsyncStorage.getItem(FAVORITES_KEY);
    if (stored) {
      set({ favoriteIds: JSON.parse(stored), loaded: true });
    } else {
      set({ loaded: true });
    }
  },
}));
