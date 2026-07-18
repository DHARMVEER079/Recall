'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from './Providers';
import Link from 'next/link';
import { 
  Home, 
  FolderHeart, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  Search, 
  Plus, 
  Menu, 
  X,
  BrainCircuit,
  Command
} from 'lucide-react';
import { logoutUser } from '@/app/actions/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, user, loadingUser, setCmdPaletteOpen } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.push('/auth');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading your memory bank...</p>
        </div>
      </div>
    );
  }

  if (!user) return null; // redirecting...

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/auth'; // full reload to clear state
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home },
    { label: 'Collections', href: '/collections', icon: FolderHeart },
    { label: 'Settings & Privacy', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-card">
        
        {/* LOGO */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            Recall
          </span>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* BOTTOM UTILITY / USER */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Cmd+K trigger hint */}
          <button 
            onClick={() => setCmdPaletteOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <span className="flex items-center gap-1.5"><Command className="h-3 w-3" /> Palette</span>
            <kbd className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px]">Ctrl+K</kbd>
          </button>

          {/* Theme & Logout */}
          <div className="flex items-center justify-between">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-3 rounded-lg bg-slate-100/50 dark:bg-slate-800/40 p-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate leading-tight">{user.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground truncate leading-tight">{user.email}</p>
            </div>
          </div>
        </div>

      </aside>

      {/* MOBILE BOTTOMBAR & COMPACT HEADER */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* Compact Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-bold text-md tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Recall
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdPaletteOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8">
          <div className="mx-auto max-w-5xl animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Tabbar */}
        <nav className="flex h-16 items-center justify-around border-t border-border bg-card md:hidden px-2 pb-safe-bottom">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
