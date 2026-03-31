import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions';
import StationManager from './pages/StationManager';
import ClaimStation from './pages/ClaimStation';
import Layout from './components/Layout';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl font-black mb-2">Lepidus</div>
          <div className="text-brand-100 text-sm">Operator Portal</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
        <Route element={session ? <Layout session={session} /> : <Navigate to="/login" replace />}>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/promotions"  element={<Promotions />} />
          <Route path="/station"     element={<StationManager />} />
          <Route path="/claim"       element={<ClaimStation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
