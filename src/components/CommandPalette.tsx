'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './Providers';
import { 
  Search, 
  Plus, 
  FolderPlus, 
  Settings, 
  Heart, 
  FileText, 
  Link2,
  Image,
  Sparkles
} from 'lucide-react';

interface CommandOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const { isCmdPaletteOpen, setCmdPaletteOpen } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isCmdPaletteOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCmdPaletteOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setCmdPaletteOpen(false);
      }
    };
    if (isCmdPaletteOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCmdPaletteOpen, setCmdPaletteOpen]);

  const commands: CommandOption[] = [
    {
      id: 'search',
      title: 'Search Memories',
      subtitle: 'Use AI search to find anything you saved',
      icon: Search,
      action: () => {
        router.push('/dashboard?focus=search');
        setCmdPaletteOpen(false);
      }
    },
    {
      id: 'save-url',
      title: 'Save URL',
      subtitle: 'Paste a link to bookmark instantly',
      icon: Link2,
      shortcut: 'N',
      action: () => {
        router.push('/dashboard?action=save-url');
        setCmdPaletteOpen(false);
      }
    },
    {
      id: 'create-note',
      title: 'Create Note',
      subtitle: 'Write a quick text memory',
      icon: FileText,
      action: () => {
        router.push('/dashboard?action=create-note');
        setCmdPaletteOpen(false);
      }
    },
    {
      id: 'upload-file',
      title: 'Upload Image / PDF',
      subtitle: 'Drag or select documents and screenshots',
      icon: Image,
      shortcut: 'U',
      action: () => {
        router.push('/dashboard?action=upload');
        setCmdPaletteOpen(false);
      }
    },
    {
      id: 'create-collection',
      title: 'Create Collection',
      subtitle: 'Organize memories into structured projects',
      icon: FolderPlus,
      action: () => {
        router.push('/collections?action=create');
        setCmdPaletteOpen(false);
      }
    },
    {
      id: 'open-favorites',
      title: 'Open Favorites',
      subtitle: 'View your starred bookmarks',
      icon: Heart,
      action: () => {
        router.push('/dashboard?filter=favorites');
        setCmdPaletteOpen(false);
      }
    },
    {
      id: 'settings',
      title: 'Go to Settings & Privacy',
      subtitle: 'Manage account, exports, and theme preferences',
      icon: Settings,
      action: () => {
        router.push('/settings');
        setCmdPaletteOpen(false);
      }
    }
  ];

  // Filter commands by search string
  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  // Keyboard navigation inside list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isCmdPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] dialog-overlay">
      <div 
        ref={containerRef}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-fade-in mx-4"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="relative flex items-center border-b border-border px-4 py-3.5">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button 
            onClick={() => setCmdPaletteOpen(false)}
            className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ESC
          </button>
        </div>

        {/* Commands List */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isSelected 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-md p-1.5 ${isSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-primary'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{cmd.title}</p>
                      <p className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{cmd.subtitle}</p>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <kbd className={`rounded px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'}`}>
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Sparkles className="h-6 w-6 text-muted-foreground mb-2 animate-pulse" />
              <p className="text-xs font-medium">No matching commands found</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground bg-slate-50/50 dark:bg-slate-800/10">
          <div className="flex gap-2">
            <span>↑↓ Navigation</span>
            <span>↵ Select</span>
          </div>
          <span>Recall Cmd Palette</span>
        </div>

      </div>
    </div>
  );
}
