import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface UserProfile {
  display_name: string | null;
  is_operator: boolean;
  loyalty_points: number;
  loyalty_tier: 'bronze' | 'silver' | 'gold';
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  loadProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, isLoading: false });
    if (session) get().loadProfile();
  },

  loadProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('display_name, is_operator, loyalty_points, loyalty_tier')
      .eq('user_id', user.id)
      .single();
    if (data) set({ profile: data as UserProfile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
