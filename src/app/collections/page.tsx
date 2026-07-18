'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useApp } from '@/components/Providers';
import { 
  getCollections, 
  createCollection, 
  deleteCollection, 
  getCollectionMemories 
} from '@/app/actions/collection';
import { performHybridSearch } from '@/lib/search';
import { 
  FolderHeart, 
  Folder, 
  Plus, 
  Trash2, 
  X, 
  Loader2, 
  Sparkles, 
  BookOpen, 
  Heart, 
  Clock, 
  ChevronRight,
  RefreshCw,
  Eye,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

function CollectionsPageContent() {
  const searchParams = useSearchParams();
  const { user } = useApp();
  const [isPending, startTransition] = useTransition();

  // Collections state
  const [collections, setCollections] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  // Create collection form fields
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colColor, setColColor] = useState('blue');

  // Selected collection view details
  const [selectedCol, setSelectedCol] = useState<any | null>(null);
  const [collectionMemories, setCollectionMemories] = useState<any[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Rediscover state
  const [resurfacedMemories, setResurfacedMemories] = useState<any[]>([]);
  const [loadingRediscover, setLoadingRediscover] = useState(true);

  const colorsList = ['blue', 'purple', 'emerald', 'amber', 'rose', 'indigo', 'orange'];

  const colorGradientMap: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800',
    purple: 'from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-800',
    emerald: 'from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800',
    amber: 'from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-800',
    rose: 'from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-800',
    indigo: 'from-indigo-500 to-violet-600 dark:from-indigo-600 dark:to-violet-800',
    orange: 'from-orange-500 to-yellow-600 dark:from-orange-600 dark:to-yellow-800'
  };

  const loadData = async () => {
    setLoadingCollections(true);
    try {
      const cols = await getCollections();
      setCollections(cols);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCollections(false);
    }
  };

  const loadRediscoverMemories = async () => {
    if (!user) return;
    setLoadingRediscover(true);
    try {
      // Fetch some random/older items for Rediscover
      const allItems = await performHybridSearch(user.id, '', { sortBy: 'oldest' });
      // Take 2 items
      const selected = allItems
        .map(i => i.memory)
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);
      setResurfacedMemories(selected);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRediscover(false);
    }
  };

  useEffect(() => {
    loadData();
    loadRediscoverMemories();

    const action = searchParams.get('action');
    if (action === 'create') {
      setCreateModalOpen(true);
    }
  }, [user]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    startTransition(async () => {
      const res = await createCollection(colName, colDesc, colColor);
      if (res.success) {
        setColName('');
        setColDesc('');
        setColColor('blue');
        setCreateModalOpen(false);
        loadData();
      } else {
        alert(res.error || 'Failed to create collection');
      }
    });
  };

  const handleDeleteCollection = async (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this collection? Saved items in it will not be deleted.')) {
      await deleteCollection(colId);
      if (selectedCol?.id === colId) setSelectedCol(null);
      loadData();
    }
  };

  const viewCollectionDetails = async (col: any) => {
    setSelectedCol(col);
    setLoadingMemories(true);
    try {
      const items = await getCollectionMemories(col.id);
      setCollectionMemories(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Predefined smart collections configuration
  const smartCollectionsList = [
    { label: 'Favorites', value: 'favorites', desc: 'Your starred memories', color: 'bg-red-500/10 text-red-500 border-red-500/20', href: '/dashboard?filter=favorites' },
    { label: 'Products', value: 'products', desc: 'Saved wishlist & laptops', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', href: '/dashboard?category=products' },
    { label: 'Articles', value: 'articles', desc: 'Blogs, docs, tutorials', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', href: '/dashboard?category=articles' },
    { label: 'Places', value: 'places', desc: 'Travel destinations & cafes', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', href: '/dashboard?category=places' },
    { label: 'Screenshots', value: 'screenshots', desc: 'OCR scanned screenshots', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', href: '/dashboard?category=screenshots' },
    { label: 'Documents', value: 'documents', desc: 'Uploaded PDFs & files', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', href: '/dashboard?category=documents' }
  ];

  return (
    <AppLayout>
      
      {/* SECTION 1: MEMORY RESURFACING (REDISCOVER) */}
      {user?.preferences?.resurfacingEnabled !== false && resurfacedMemories.length > 0 && (
        <section className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/10 p-5 mb-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5 leading-none">
              <Sparkles className="h-4.5 w-4.5 animate-pulse text-blue-500" /> Rediscover Forgotten Memories
            </h3>
            <button 
              onClick={loadRediscoverMemories}
              className="text-blue-500 hover:text-blue-600 p-1 rounded hover:bg-blue-100/50 dark:hover:bg-blue-950/30 transition-colors"
              title="Refresh resurfaced memories"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {resurfacedMemories.map((m) => (
              <div 
                key={m.id} 
                className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-muted-foreground uppercase">
                      {m.type}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-3 w-3" /> Saved on {new Date(m.savedAt).toLocaleDateString(undefined, { dateStyle: 'short' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground mt-3 line-clamp-1">{m.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{m.summary || m.rawText}</p>
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t border-border/60 pt-3">
                  <Link 
                    href={`/dashboard?focus=search&q=${encodeURIComponent(m.title)}`}
                    className="text-[9.5px] font-bold text-primary flex items-center gap-0.5 hover:underline"
                  >
                    View in Dashboard <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: CUSTOM COLLECTIONS GRID */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Custom Collections
          </h3>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-primary hover:bg-blue-600 px-3 py-1.5 text-xs font-bold text-primary-foreground transition-all shadow-sm shadow-blue-500/10"
          >
            <Plus className="h-4 w-4" />
            <span>Create Collection</span>
          </button>
        </div>

        {loadingCollections ? (
          <div className="flex py-10 justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : collections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {collections.map((col) => (
              <div
                key={col.id}
                onClick={() => viewCollectionDetails(col)}
                className="group relative rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Cover Gradient bar */}
                <div className={`h-3 bg-gradient-to-r ${colorGradientMap[col.coverColor] || colorGradientMap.blue}`} />
                
                <div className="p-4 flex flex-col justify-between h-[115px]">
                  <div>
                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {col.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {col.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {col.memoriesCount} items saved
                    </span>
                    <button
                      onClick={(e) => handleDeleteCollection(col.id, e)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Delete collection wrapper"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground bg-slate-50/10">
            <Folder className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-xs font-semibold">No custom collections found</p>
            <p className="text-[10px] mt-0.5">Click the button above to organize your travel, work, or shopping research.</p>
          </div>
        )}
      </section>

      {/* SECTION 3: SMART AUTOMATED COLLECTIONS */}
      <section className="mb-8 border-t border-border pt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Smart Collections
        </h3>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
          {smartCollectionsList.map((col, idx) => (
            <Link
              key={idx}
              href={col.href}
              className={`rounded-xl border p-3.5 hover:shadow-sm text-left transition-all ${col.color}`}
            >
              <h4 className="text-xs font-bold leading-none">{col.label}</h4>
              <p className="text-[9.5px] opacity-80 mt-2 font-medium leading-tight">{col.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* DETAILED MEMORIES SLIDE-OUT MODAL */}
      {selectedCol && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full border-l border-border bg-card p-6 shadow-2xl flex flex-col justify-between animate-fade-in relative z-50">
            
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <FolderHeart className="h-4.5 w-4.5" /> {selectedCol.name}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-1">{selectedCol.description || 'Collection archives'}</p>
              </div>
              <button 
                onClick={() => setSelectedCol(null)} 
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Memories Feed */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
              {loadingMemories ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : collectionMemories.length > 0 ? (
                collectionMemories.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-background p-3.5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span className="font-bold uppercase tracking-wider">{m.type}</span>
                      <span>{new Date(m.savedAt).toLocaleDateString()}</span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground mt-2 line-clamp-1">{m.title}</h5>
                    <p className="text-[10.5px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{m.summary || m.rawText}</p>
                    
                    <div className="flex justify-between items-center mt-3 border-t border-border/50 pt-2.5">
                      <span className="text-[9px] text-muted-foreground italic truncate max-w-[190px]">{m.sourceDomain || 'Local Note'}</span>
                      <div className="flex gap-2">
                        {m.sourceUrl && (
                          <a href={m.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-[9px] font-bold flex items-center gap-0.5">
                            Visit <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                        <Link href={`/dashboard?focus=search&q=${encodeURIComponent(m.title)}`} className="text-primary hover:underline text-[9px] font-bold flex items-center gap-0.5">
                          View details <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground text-xs">
                  <p>No items in this collection.</p>
                  <p className="text-[10px] mt-1">Add items from the Dashboard cards.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CREATE COLLECTION FORM */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl animate-fade-in">
            
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Create New Collection
              </h4>
              <button 
                onClick={() => setCreateModalOpen(false)} 
                className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Collection Name</label>
                <input
                  type="text"
                  placeholder="e.g. Goa Trip, SSC Preparation..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  value={colName}
                  onChange={(e) => setColName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Description (Optional)</label>
                <textarea
                  placeholder="What is this collection for?..."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none resize-none"
                  value={colDesc}
                  onChange={(e) => setColDesc(e.target.value)}
                />
              </div>

              {/* Cover Color Selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Cover Gradient Accent</label>
                <div className="flex flex-wrap gap-2">
                  {colorsList.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColColor(c)}
                      className={`h-5 w-5 rounded-full bg-gradient-to-r ${colorGradientMap[c]} border-2 transition-all ${
                        colColor === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !colName.trim()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-blue-600 px-4 py-2.5 text-xs font-bold text-primary-foreground transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Collection'}
              </button>
            </form>

          </div>
        </div>
      )}

    </AppLayout>
  );
}

import { Suspense } from 'react';

export default function CollectionsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <FolderHeart className="h-10 w-10 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Loading collections...</p>
        </div>
      </div>
    }>
      <CollectionsPageContent />
    </Suspense>
  );
}
