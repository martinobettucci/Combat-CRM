import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Users, Swords, User, LogOut, Menu, X, MessageSquare, CreditCard } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import Notifications from './Notifications';

export default function Layout() {
  const { profile, logOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Users },
    { name: 'Opportunities', href: '/opportunities', icon: Swords },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Profile', href: '/profile', icon: User },
    ...(profile?.role === 'coach' || profile?.role === 'admin' ? [{ name: 'Pricing', href: '/pricing', icon: CreditCard }] : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mobile sidebar */}
      <div className={clsx("fixed inset-0 z-50 lg:hidden", mobileMenuOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xl font-bold text-white">FightHQ.eu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-zinc-800 lg:bg-zinc-900">
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-zinc-800">
          <span className="text-xl font-bold text-white">FightHQ.eu</span>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <nav className="flex-1 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-zinc-800 overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="h-full w-full p-1.5 text-zinc-400" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">{profile?.firstName} {profile?.lastName}</span>
                <span className="text-xs text-zinc-500 capitalize">{profile?.role}</span>
              </div>
            </div>
            <button
              onClick={logOut}
              className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-800 bg-zinc-900/80 px-4 shadow-sm backdrop-blur-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button type="button" className="-m-2.5 p-2.5 text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Notifications />
              {/* Mobile profile */}
              <div className="h-8 w-8 rounded-full bg-zinc-800 overflow-hidden">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User className="h-full w-full p-1.5 text-zinc-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="hidden lg:flex lg:justify-end lg:mb-8">
              <Notifications />
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
