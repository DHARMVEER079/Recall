'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/components/Providers';
import { 
  saveLinkMemory, 
  saveNoteMemory, 
  saveUploadMemory,
  updateMemory, 
  deleteMemory,
  getMemoryStats
} from '@/app/actions/memory';
import { addMemoryToCollection, getCollections } from '@/app/actions/collection';
import { performHybridSearch } from '@/lib/search';
import { askQuestionAboutMemory } from '@/app/actions/qa';
import { 
  Search, 
  Link2, 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  Heart, 
  Trash2, 
  Archive, 
  FolderPlus, 
  ExternalLink,
  ChevronDown, 
  BookOpen, 
  MapPin, 
  ShoppingBag, 
  Video, 
  FileUp, 
  MoreVertical,
  X,
  Send,
  Loader2,
  Calendar,
  Layers,
  HelpCircle,
  BrainCircuit
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useApp();
  const [isPending, startTransition] = useTransition();

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'oldest'>('relevance');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);

  // Quick Save Input States
  const [urlInput, setUrlInput] = useState('');
  const [noteTitleInput, setNoteTitleInput] = useState('');
  const [noteContentInput, setNoteContentInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Modals & Panels toggles
  const [activeTab, setActiveTab] = useState<'url' | 'note' | 'upload'>('url');
  const [duplicateWarning, setDuplicateWarning] = useState<{ url: string, id: string } | null>(null);
  
  // Detail Modal & QA Panel States
  const [activeMemory, setActiveMemory] = useState<any | null>(null);
  const [qaInput, setQaInput] = useState('');
  const [qaChat, setQaChat] = useState<{ q: string, a: string, loading: boolean }[]>([]);
  
  // Collection Add Popover
  const [collectionsList, setCollectionsList] = useState<any[]>([]);
  const [selectedColMemoryId, setSelectedColMemoryId] = useState<string | null>(null);

  // Dashboard Stats
  const [stats, setStats] = useState<any>({
    totalCount: 0,
    linksCount: 0,
    imagesCount: 0,
    pdfsCount: 0,
    notesCount: 0,
    topDomain: 'N/A',
    favoritesCount: 0
  });

  // Handle Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load collections
  const loadCollections = async () => {
    const cols = await getCollections();
    setCollectionsList(cols);
  };

  // Fetch Memories & Stats
  const fetchData = async () => {
    if (!user) return;
    setLoadingMemories(true);
    try {
      const results = await performHybridSearch(user.id, debouncedQuery, {
        category: activeCategory === 'all' ? undefined : activeCategory,
        isFavorite: filterFavorites ? true : undefined,
        sortBy
      });
      setMemories(results);
      
      const st = await getMemoryStats();
      if (st) setStats(st);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadCollections();
  }, [debouncedQuery, activeCategory, filterFavorites, sortBy, user]);

  // Handle query parameter interactions (from PWA share target or command palette)
  useEffect(() => {
    const sharedUrl = searchParams.get('url') || searchParams.get('text');
    const sharedTitle = searchParams.get('title');
    const action = searchParams.get('action');
    const filter = searchParams.get('filter');

    if (sharedUrl) {
      // If shared text has a URL, parse it
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const match = sharedUrl.match(urlRegex);
      if (match) {
        setUrlInput(match[0]);
        setActiveTab('url');
      } else {
        setNoteContentInput(sharedUrl);
        setNoteTitleInput(sharedTitle || 'Shared Content');
        setActiveTab('note');
      }
    }

    if (action === 'save-url') {
      setActiveTab('url');
    } else if (action === 'create-note') {
      setActiveTab('note');
    } else if (action === 'upload') {
      setActiveTab('upload');
    }

    if (filter === 'favorites') {
      setFilterFavorites(true);
    }
  }, [searchParams]);

  // Handle URL Save submission
  const handleUrlSave = async (force: boolean = false) => {
    if (!urlInput.trim()) return;
    setDuplicateWarning(null);

    startTransition(async () => {
      const res = await saveLinkMemory(urlInput, undefined, force);
      if (res.success) {
        setUrlInput('');
        fetchData();
      } else if (res.duplicate && res.existingId) {
        setDuplicateWarning({ url: urlInput, id: res.existingId });
      } else {
        alert(res.error || 'Failed to save URL');
      }
    });
  };

  // Handle Note Save submission
  const handleNoteSave = async () => {
    if (!noteContentInput.trim()) return;

    startTransition(async () => {
      const res = await saveNoteMemory(noteContentInput, noteTitleInput);
      if (res.success) {
        setNoteTitleInput('');
        setNoteContentInput('');
        fetchData();
      } else {
        alert(res.error || 'Failed to save note');
      }
    });
  };

  // Handle File Upload submission
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    startTransition(async () => {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await saveUploadMemory(
          selectedFile.name,
          selectedFile.type,
          base64Data
        );

        if (res.success) {
          setSelectedFile(null);
          fetchData();
        } else {
          alert(res.error || 'Failed to upload file');
        }
      };
    });
  };

  // Toggle Favorite Status
  const handleToggleFavorite = async (item: any) => {
    const nextVal = !item.isFavorite;
    // Optimistic local update
    setMemories(prev => prev.map(m => m.memory.id === item.id ? { ...m, memory: { ...m.memory, isFavorite: nextVal } } : m));
    await updateMemory(item.id, { isFavorite: nextVal });
    fetchData();
  };

  // Toggle Archive Status
  const handleToggleArchive = async (item: any) => {
    const nextVal = !item.isArchived;
    setMemories(prev => prev.map(m => m.memory.id === item.id ? { ...m, memory: { ...m.memory, isArchived: nextVal } } : m));
    await updateMemory(item.id, { isArchived: nextVal });
    fetchData();
  };

  // Delete Memory
  const handleDeleteMemory = async (memoryId: string) => {
    if (confirm('Are you sure you want to permanently delete this memory?')) {
      await deleteMemory(memoryId);
      if (activeMemory?.id === memoryId) setActiveMemory(null);
      fetchData();
    }
  };

  // Add memory to custom Collection
  const handleAddToCollection = async (collectionId: string) => {
    if (!selectedColMemoryId) return;
    const res = await addMemoryToCollection(collectionId, selectedColMemoryId);
    if (res.success) {
      setSelectedColMemoryId(null);
      alert('Memory added to collection.');
      loadCollections();
    } else {
      alert(res.error || 'Failed to add to collection.');
    }
  };

  // Contextual Memory Q&A submission
  const handleQaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || !activeMemory) return;

    const q = qaInput.trim();
    setQaInput('');
    
    // Add question to chat locally
    setQaChat(prev => [...prev, { q, a: '', loading: true }]);

    const res = await askQuestionAboutMemory(activeMemory.id, q);
    
    setQaChat(prev => prev.map(chat => 
      chat.q === q 
        ? { q, a: res.answer || res.error || 'Failed to fetch answer.', loading: false } 
        : chat
    ));
  };

  // Retrieve details of memory to view in modal
  const openMemoryDetails = (item: any) => {
    setActiveMemory(item);
    setQaChat([]); // Reset QA history
  };

  // Heuristic icon getter
  const getMemoryIcon = (type: string) => {
    switch (type) {
      case 'link': return <Link2 className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  // Categories helper mapping
  const categories = [
    { label: 'All memories', value: 'all', icon: Layers },
    { label: 'Products', value: 'products', icon: ShoppingBag },
    { label: 'Articles', value: 'articles', icon: BookOpen },
    { label: 'Videos', value: 'videos', icon: Video },
    { label: 'Places', value: 'places', icon: MapPin },
    { label: 'Screenshots', value: 'screenshots', icon: ImageIcon },
    { label: 'Documents', value: 'documents', icon: FileText },
    { label: 'Notes & Ideas', value: 'ideas', icon: FileText }
  ];

  return (
    <AppLayout>
      
      {/* QUICK SAVE CARD PANEL */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Quick Capture Memory
        </h3>
        
        {/* TAB BUTTONS */}
        <div className="flex gap-2 border-b border-border pb-3 mb-4">
          {[
            { id: 'url', label: 'Save Web Link', icon: Link2 },
            { id: 'note', label: 'Write Note', icon: FileText },
            { id: 'upload', label: 'Upload File', icon: Upload }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setDuplicateWarning(null);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT PANEL */}
        <div>
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste URL here (e.g. https://github.com)..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSave(false)}
                />
                <button
                  onClick={() => handleUrlSave(false)}
                  disabled={isPending}
                  className="rounded-lg bg-primary hover:bg-blue-600 px-4 py-2 text-xs font-bold text-primary-foreground transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {isPending && activeTab === 'url' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </button>
              </div>

              {/* Duplicate modal warning */}
              {duplicateWarning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between animate-fade-in">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold">You already saved this URL.</p>
                    <p className="text-[10px] opacity-80">Do you want to open the existing memory or save a duplicate copy?</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const existing = memories.find(m => m.memory.id === duplicateWarning.id);
                        if (existing) openMemoryDetails(existing.memory);
                        setDuplicateWarning(null);
                      }}
                      className="rounded border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 px-2.5 py-1 font-bold text-[10px]"
                    >
                      View Existing
                    </button>
                    <button
                      onClick={() => handleUrlSave(true)}
                      className="rounded bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-white font-bold text-[10px]"
                    >
                      Save Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'note' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Note Title (Optional)..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                value={noteTitleInput}
                onChange={(e) => setNoteTitleInput(e.target.value)}
              />
              <textarea
                placeholder="Write your note/thought here..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none resize-none"
                value={noteContentInput}
                onChange={(e) => setNoteContentInput(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleNoteSave}
                  disabled={isPending || !noteContentInput.trim()}
                  className="rounded-lg bg-primary hover:bg-blue-600 px-4 py-2 text-xs font-bold text-primary-foreground transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {isPending && activeTab === 'note' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <form onSubmit={handleFileUpload} className="space-y-3">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg bg-background p-6 text-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary truncate max-w-[280px]">{selectedFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-foreground">Select a Screenshot or PDF Document</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Supports PNG, JPEG, WEBP, and PDF up to 10MB</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPending || !selectedFile}
                  className="rounded-lg bg-primary hover:bg-blue-600 px-4 py-2 text-xs font-bold text-primary-foreground transition-all flex items-center gap-1 disabled:opacity-50"
                >
                  {isPending && activeTab === 'upload' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Upload Memory'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* DASHBOARD STATS OVERVIEW */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Memory', value: stats.totalCount, detail: `${stats.linksCount} links, ${stats.notesCount} notes` },
          { label: 'Files Uploaded', value: stats.imagesCount + stats.pdfsCount, detail: `${stats.imagesCount} screenshots, ${stats.pdfsCount} PDFs` },
          { label: 'Top Domain Source', value: stats.topDomain.split(' ')[0], detail: stats.topDomain.includes('(') ? stats.topDomain.split(' ')[1].replace(/[()]/g, '') : 'None' },
          { label: 'Starred Favorites', value: stats.favoritesCount, detail: 'Marked important' }
        ].map((s, idx) => (
          <div key={idx} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">{s.label}</p>
            <p className="text-2xl font-extrabold text-foreground mt-2 leading-none">{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-2 font-medium">{s.detail}</p>
          </div>
        ))}
      </section>

      {/* UNIVERSAL HYBRID SEARCH */}
      <section className="flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none shadow-sm"
            placeholder="Search your private mind... (e.g. 'find the black shoes I saved')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {debouncedQuery && (
            <div className="absolute right-3 top-2.5 flex items-center gap-1 rounded bg-emerald-500/10 dark:bg-emerald-500/25 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-2.5 w-2.5" /> Semantic Vector Search
            </div>
          )}
        </div>

        {/* SORT / FAVORITES FILTER */}
        <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
          <button
            onClick={() => setFilterFavorites(prev => !prev)}
            className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold shadow-sm transition-all ${
              filterFavorites
                ? 'border-red-500 bg-red-50 dark:bg-red-950/20 text-red-500'
                : 'border-border bg-card text-foreground hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Heart className={`h-4 w-4 ${filterFavorites ? 'fill-red-500 text-red-500' : ''}`} />
            <span>Starred</span>
          </button>

          <div className="relative flex items-center rounded-lg border border-border bg-card px-2.5 py-2 shadow-sm text-xs font-semibold">
            <span className="text-muted-foreground mr-1">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-foreground focus:outline-none cursor-pointer pr-1"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>
      </section>

      {/* CATEGORY FILTER CAPSULES */}
      <section className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shrink-0 border transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-slate-300 dark:hover:border-slate-600 hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </section>

      {/* MEMORY CARD FEED */}
      <section className="relative min-h-[250px]">
        {loadingMemories ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground font-medium">Indexing memories...</p>
          </div>
        ) : memories.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memories.map(({ memory, score }) => (
              <div 
                key={memory.id} 
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all hover:shadow-md animate-fade-in"
              >
                <div>
                  {/* Card Header Info */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                      {getMemoryIcon(memory.type)}
                      {memory.type.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-2">
                      {debouncedQuery && (
                        <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none">
                          {Math.round(score * 100)}% Match
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {memory.status !== 'READY' && memory.status !== 'PROCESSED' && (
                          <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded leading-none ${
                            memory.status === 'FAILED' 
                              ? 'bg-rose-500/10 text-rose-500' 
                              : 'bg-amber-500/10 text-amber-500 animate-pulse'
                          }`}>
                            {memory.status === 'CAPTURED' ? 'Scraping...' :
                             memory.status === 'METADATA_EXTRACTED' ? 'Scraped' :
                             memory.status === 'AI_CLASSIFIED' ? 'Summarizing...' :
                             memory.status === 'EMBEDDING_GENERATED' ? 'Indexing...' : 'Processing...'}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(memory.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <h4 
                    onClick={() => openMemoryDetails(memory)}
                    className="text-xs font-bold text-foreground mt-3 group-hover:text-primary transition-colors cursor-pointer line-clamp-1"
                  >
                    {memory.title}
                  </h4>
                  {memory.sourceDomain && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">{memory.sourceDomain}</p>
                  )}

                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                    {memory.summary || memory.rawText || 'Processing saved resource content...'}
                  </p>

                  {/* Tags list */}
                  {memory.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {memory.tags.slice(0, 3).map((mt: any) => (
                        <span key={mt.tag.id} className="text-[9px] font-semibold text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                          #{mt.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions bar */}
                <div className="flex items-center justify-between border-t border-border mt-4 pt-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleFavorite(memory)}
                      className={`text-muted-foreground hover:text-red-500 transition-colors ${memory.isFavorite ? 'text-red-500' : ''}`}
                      title={memory.isFavorite ? 'Unstar Favorite' : 'Star Favorite'}
                    >
                      <Heart className={`h-4 w-4 ${memory.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(memory)}
                      className="text-muted-foreground hover:text-indigo-500 transition-colors"
                      title={memory.isArchived ? 'Unarchive' : 'Archive'}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedColMemoryId(memory.id);
                        loadCollections();
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Add to Collection"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 items-center">
                    {memory.sourceUrl && (
                      <a
                        href={memory.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-[9px] font-bold flex items-center gap-0.5"
                      >
                        Visit <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Delete Memory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
            <Layers className="h-10 w-10 text-muted-foreground/60 mb-2.5" />
            <p className="text-xs font-semibold text-foreground">Your memory bank is empty</p>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[280px]">
              Capture a web link, write a note, or upload a screenshot to start remembering.
            </p>
          </div>
        )}
      </section>

      {/* POPUP / MODAL: ADD TO COLLECTION */}
      {selectedColMemoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FolderPlus className="h-4.5 w-4.5 text-primary" /> Add to Collection
              </h4>
              <button onClick={() => setSelectedColMemoryId(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {collectionsList.length > 0 ? (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {collectionsList.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleAddToCollection(col.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border hover:border-primary hover:bg-primary/5 p-2.5 text-left text-xs font-semibold transition-all"
                  >
                    <span>{col.name}</span>
                    <span className="text-[10px] text-muted-foreground">({col.memoriesCount} items)</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <p>No collections created yet.</p>
                <button 
                  onClick={() => router.push('/collections?action=create')}
                  className="text-primary font-bold hover:underline mt-2 inline-block"
                >
                  Create a collection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL VIEW: MEMORY DETAIL PAGE & CONTEXTUAL Q&A */}
      {activeMemory && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-xl border border-border bg-card shadow-2xl animate-fade-in flex flex-col md:flex-row overflow-hidden max-h-[85vh]">
            
            {/* LEFT DETAILS COLUMN */}
            <div className="flex-1 p-5 overflow-y-auto border-b md:border-b-0 md:border-r border-border max-h-[40vh] md:max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <span className="flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {getMemoryIcon(activeMemory.type)}
                  {activeMemory.type.toUpperCase()}
                </span>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleFavorite(activeMemory)}
                    className={`rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 ${activeMemory.isFavorite ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`h-4.5 w-4.5 ${activeMemory.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleDeleteMemory(activeMemory.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                  <button onClick={() => setActiveMemory(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Title & Domain */}
              <h3 className="text-sm font-extrabold text-foreground leading-snug">{activeMemory.title}</h3>
              {activeMemory.sourceUrl && (
                <a 
                  href={activeMemory.sourceUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-primary font-bold hover:underline flex items-center gap-0.5 mt-1"
                >
                  {activeMemory.sourceDomain || activeMemory.sourceUrl} <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {/* Date */}
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-3">
                <Calendar className="h-3.5 w-3.5" />
                <span>Saved on {new Date(activeMemory.savedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </div>

              {/* File Image Preview if upload */}
              {activeMemory.filePath && activeMemory.type === 'image' && (
                <div className="mt-4 border border-border rounded-lg overflow-hidden bg-slate-950/20 max-h-[160px] flex items-center justify-center">
                  <img 
                    src={activeMemory.filePath} 
                    alt={activeMemory.title}
                    className="max-h-[160px] object-contain w-full"
                  />
                </div>
              )}

              {/* AI Summary Block */}
              <div className="mt-4 bg-primary/5 rounded-lg border border-primary/10 p-3.5">
                <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI Synthesis Summary
                </h5>
                <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                  {activeMemory.summary || 'AI metadata is compiling...'}
                </p>
              </div>

              {/* Extracted/Raw Text Content */}
              {activeMemory.rawText && (
                <div className="mt-4">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Note Content</h5>
                  <div className="rounded-lg border border-border bg-slate-100/50 dark:bg-slate-800/40 p-3 text-xs text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {activeMemory.rawText}
                  </div>
                </div>
              )}

              {/* Extracted OCR Text Content */}
              {activeMemory.ocrText && (
                <div className="mt-4">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Extracted Screenshot Text (OCR)</h5>
                  <div className="rounded-lg border border-border bg-slate-100/50 dark:bg-slate-800/40 p-3 text-xs text-foreground leading-relaxed overflow-x-auto">
                    {activeMemory.ocrText}
                  </div>
                </div>
              )}

              {/* Tags panel */}
              {activeMemory.tags?.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Memory Tags</h5>
                  <div className="flex flex-wrap gap-1.5">
                    {activeMemory.tags.map((mt: any) => (
                      <span key={mt.tag.id} className="text-[10px] font-semibold text-primary bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-full">
                        #{mt.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT Q&A COLUMN */}
            <div className="w-full md:w-[380px] bg-slate-50/50 dark:bg-slate-800/20 p-5 flex flex-col justify-between max-h-[45vh] md:max-h-[85vh] border-t md:border-t-0 border-border">
              
              {/* QA Header */}
              <div className="flex items-center justify-between border-b border-border pb-3 mb-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <HelpCircle className="h-4.5 w-4.5 text-primary" />
                  <span>Ask Memory Q&amp;A</span>
                </div>
                <button onClick={() => setActiveMemory(null)} className="hidden md:block rounded-lg p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* QA Chat View */}
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-2 text-xs">
                {qaChat.length > 0 ? (
                  qaChat.map((chat, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-end">
                        <div className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 max-w-[85%] font-medium">
                          {chat.q}
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="rounded-lg bg-card border border-border px-3 py-2 max-w-[85%] text-foreground/90 leading-relaxed font-medium">
                          {chat.loading ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
                            </div>
                          ) : (
                            chat.a
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-8">
                    <BrainCircuit className="h-7 w-7 text-muted-foreground/60 mb-2 animate-bounce" />
                    <p className="font-semibold text-xs text-foreground/80">Contextual Assistant</p>
                    <p className="text-[10px] text-muted-foreground max-w-[190px] mt-0.5">
                      Ask questions about dates, specific details, or request summaries of this memory.
                    </p>
                    <div className="mt-4 flex flex-col gap-1.5 w-full">
                      {[
                        "Summarize this memory.",
                        "What is the core theme?",
                        "What are the main key points?"
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setQaInput(item);
                          }}
                          className="rounded border border-border bg-card px-2.5 py-1 text-[10px] text-left hover:border-primary font-semibold text-muted-foreground hover:text-primary transition-all truncate"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* QA Input Form */}
              <form onSubmit={handleQaSubmit} className="flex gap-2 border-t border-border pt-3 mt-3 shrink-0">
                <input
                  type="text"
                  placeholder="Ask memory details..."
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  value={qaInput}
                  onChange={(e) => setQaInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!qaInput.trim()}
                  className="rounded-lg bg-primary hover:bg-blue-600 p-2 text-primary-foreground disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

            </div>

          </div>
        </div>
      )}

    </AppLayout>
  );
}

import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
