import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Props { session: Session }

const NAV = [
  { to: '/',           icon: '📊', label: 'Dashboard'    },
  { to: '/promotions', icon: '🏷️', label: 'Deals'        },
  { to: '/station',    icon: '⛽', label: 'My Station'   },
  { to: '/claim',      icon: '🔗', label: 'Claim Station' },
  { to: '/billing',   icon: '💳', label: 'Billing'       },
];

export default function Layout({ session }: Props) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="w-64 bg-gray-900 flex flex-col min-h-screen">
        {/* Brand */}
        <div className="px-6 py-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white text-lg">
              ⛽
            </div>
            <div>
              <div className="text-white font-black text-lg leading-none tracking-tight">Lepidus</div>
              <div className="text-gray-500 text-xs mt-0.5">Operator Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-6 border-t border-gray-800 pt-4">
          <div className="px-3 mb-3">
            <div className="text-xs text-gray-500 truncate">{session.user.email}</div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span>🚪</span>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
