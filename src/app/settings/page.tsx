'use client';

import React, { useState, useEffect, useTransition } from 'react';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/components/Providers';
import { 
  updateUserPreferences, 
  exportUserData, 
  deleteAllMemories, 
  deleteSearchHistory, 
  deleteUserAccount 
} from '@/app/actions/settings';
import { 
  ShieldCheck, 
  Download, 
  Trash2, 
  Eye, 
  Sun, 
  Moon, 
  Sparkles, 
  Bell, 
  Database, 
  Loader2, 
  User as UserIcon,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const { user, theme, toggleTheme, refreshUser } = useApp();
  const [isPending, startTransition] = useTransition();

  // Preferences local states
  const [aiSummaries, setAiSummaries] = useState(true);
  const [resurfacingEnabled, setResurfacingEnabled] = useState(true);

  // Sync state with user profile preferences
  useEffect(() => {
    if (user?.preferences) {
      setAiSummaries(user.preferences.aiSummaries);
      setResurfacingEnabled(user.preferences.resurfacingEnabled);
    }
  }, [user]);

  // Handle saving preference toggles
  const handlePreferenceChange = async (updates: { aiSummaries?: boolean; resurfacingEnabled?: boolean }) => {
    startTransition(async () => {
      const res = await updateUserPreferences(updates);
      if (res.success) {
        await refreshUser();
      } else {
        alert(res.error || 'Failed to update preferences');
      }
    });
  };

  // Export Data Action
  const handleExportData = async () => {
    try {
      const data = await exportUserData();
      
      // Trigger JSON download file in browser
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `recall_memory_export_${user?.name?.toLowerCase().replace(/\s+/g, '_') || 'data'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(err.message || 'Export failed.');
    }
  };

  // Clear Search Logs Action
  const handleClearSearchHistory = async () => {
    if (confirm('Are you sure you want to clear your search log history? This action is permanent.')) {
      startTransition(async () => {
        const res = await deleteSearchHistory();
        if (res.success) {
          alert('Search history cleared.');
        } else {
          alert(res.error || 'Operation failed.');
        }
      });
    }
  };

  // Wipe All Memories Action
  const handleWipeMemories = async () => {
    if (confirm('WARNING: Are you sure you want to permanently delete ALL saved links, screenshots, notes, and documents? This cannot be undone.')) {
      startTransition(async () => {
        const res = await deleteAllMemories();
        if (res.success) {
          alert('All memories have been deleted.');
          await refreshUser();
        } else {
          alert(res.error || 'Operation failed.');
        }
      });
    }
  };

  // Terminate Account Action
  const handleDeleteAccount = async () => {
    if (confirm('CRITICAL WARNING: Are you sure you want to delete your Recall account? This will permanently wipe your profile, credentials, files, and all memories. You will be logged out immediately. This action is irreversible.')) {
      startTransition(async () => {
        const res = await deleteUserAccount();
        if (res.success) {
          alert('Your account and memories have been permanently deleted.');
          window.location.href = '/'; // redirect to landing
        } else {
          alert(res.error || 'Operation failed.');
        }
      });
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl">
        
        {/* HEADER SECTION */}
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Settings &amp; Privacy</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure your personal digital memory preferences, backups, and security policies.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          
          {/* PROFILE & PREFERENCES COLUMN */}
          <div className="md:col-span-2 space-y-6">
            
            {/* PROFILE SECTION */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 leading-none">
                <UserIcon className="h-4.5 w-4.5 text-primary" /> Profile Details
              </h3>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Name</p>
                  <p className="text-xs font-semibold text-foreground mt-1.5">{user.name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Email Address</p>
                  <p className="text-xs font-semibold text-foreground mt-1.5">{user.email}</p>
                </div>
              </div>
            </div>

            {/* PREFERENCES SECTION */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 leading-none">
                <Database className="h-4.5 w-4.5 text-primary" /> Application Preferences
              </h3>

              {/* Theme toggle option */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">App Appearance Mode</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Toggle between dark and light themes</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {theme === 'dark' ? (
                    <><Moon className="h-4 w-4 text-primary" /> Dark Mode</>
                  ) : (
                    <><Sun className="h-4 w-4 text-amber-500" /> Light Mode</>
                  )}
                </button>
              </div>

              {/* AI Summaries toggle option */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">AI Auto-Summarization</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Allow AI to extract page metadata, titles, and generate descriptions</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !aiSummaries;
                    setAiSummaries(nextVal);
                    handlePreferenceChange({ aiSummaries: nextVal });
                  }}
                  className={`rounded-full px-4 py-1 text-[11px] font-semibold border transition-all ${
                    aiSummaries
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-slate-100 border-border text-muted-foreground dark:bg-slate-800'
                  }`}
                >
                  {aiSummaries ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Memory Resurfacing option */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">Rediscover Resurfacing</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Resurface forgotten memories periodically on the collections page</p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !resurfacingEnabled;
                    setResurfacingEnabled(nextVal);
                    handlePreferenceChange({ resurfacingEnabled: nextVal });
                  }}
                  className={`rounded-full px-4 py-1 text-[11px] font-semibold border transition-all ${
                    resurfacingEnabled
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-slate-100 border-border text-muted-foreground dark:bg-slate-800'
                  }`}
                >
                  {resurfacingEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

            </div>

          </div>

          {/* PRIVACY CENTER COLUMN */}
          <div className="space-y-6">
            
            {/* PRIVACY INFO PANEL */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 leading-none">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" /> Privacy Center
              </h3>
              
              <div className="space-y-2.5 text-[10px] text-muted-foreground leading-relaxed">
                <p>
                  <strong>Data Ownership:</strong> You retain complete ownership of all bookmarked URLs, personal notes, and uploaded files.
                </p>
                <p>
                  <strong>AI Providers:</strong> Recall utilizes secure Google Gemini endpoints to process summaries, OCR, and embeddings. External models do not train on your private digital memories.
                </p>
                <p>
                  <strong>Encryption:</strong> Memories are isolated per user account. Data is encrypted in transit and stored in a secure local database partition.
                </p>
              </div>
            </div>

            {/* PRIVACY CONTROLS ACTION PANEL */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground leading-none">
                Data Controls
              </h3>

              <div className="space-y-2 text-xs">
                {/* Export Data */}
                <button
                  onClick={handleExportData}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold"
                >
                  <Download className="h-4 w-4 text-primary" />
                  <span>Export All Data (JSON)</span>
                </button>

                {/* Clear search logs */}
                <button
                  onClick={handleClearSearchHistory}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-semibold text-amber-600 dark:text-amber-500"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>Clear Search History</span>
                </button>

                {/* Delete all memories */}
                <button
                  onClick={handleWipeMemories}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors font-semibold text-rose-500"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>Delete All Memories</span>
                </button>

                {/* Delete account */}
                <button
                  onClick={handleDeleteAccount}
                  disabled={isPending}
                  className="flex w-full items-center gap-2 rounded-lg bg-rose-500 text-white px-3 py-2 hover:bg-rose-600 transition-colors font-bold text-center justify-center shadow-lg shadow-rose-500/10"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>Delete Account Permanent</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}
