'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  ExternalLink, 
  Folder, 
  ShoppingBag, 
  MapPin, 
  FileText, 
  Globe, 
  ArrowRight 
} from 'lucide-react';

interface MockItem {
  title: string;
  domain: string;
  category: 'Products' | 'Places' | 'Articles' | 'Documents';
  summary: string;
  date: string;
  relevance: number;
}

const mockMemories: Record<string, MockItem[]> = {
  shoes: [
    {
      title: "Nike Air Zoom Pegasus 40 - Black Runner",
      domain: "nike.com",
      category: "Products",
      summary: "Comfortable black running shoe featuring React Foam cushioning. Saved during the summer clearance sale.",
      date: "3 weeks ago",
      relevance: 98
    },
    {
      title: "Adidas Ultraboost Light Running Shoes",
      domain: "adidas.com",
      category: "Products",
      summary: "All-black premium athletic sneakers with light Boost sole. Saved to compare with the Pegasus model.",
      date: "1 month ago",
      relevance: 82
    }
  ],
  goa: [
    {
      title: "Thalassa Restaurant - Vagator Beach",
      domain: "thalassagoa.com",
      category: "Places",
      summary: "Greek beachfront taverna in Goa. Famous for sunsets, kebabs, and live performances. Recommended by travel blog.",
      date: "2 months ago",
      relevance: 95
    },
    {
      title: "Gunpowder Restaurant - Assagao",
      domain: "lbb.in",
      category: "Places",
      summary: "Coastal South Indian food set in a gorgeous heritage Portuguese bungalow garden. Must try Pandhi curry.",
      date: "2 months ago",
      relevance: 88
    }
  ],
  react: [
    {
      title: "React Server Components (RSC) Reference Guide",
      domain: "react.dev",
      category: "Articles",
      summary: "Official documentation detailing RSC behavior, serialization, streaming boundaries, and data fetching patterns.",
      date: "5 days ago",
      relevance: 96
    }
  ],
  ssc: [
    {
      title: "SSC CGL Syllabus and Exam Pattern PDF 2026",
      domain: "ssc.gov.in",
      category: "Documents",
      summary: "Official PDF document outlining Tier 1 and Tier 2 exam topics, marks weighting, and section durations.",
      date: "2 weeks ago",
      relevance: 97
    }
  ]
};

export default function LandingDemo() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MockItem[]>([]);
  const [activeQueryKey, setActiveQueryKey] = useState<string | null>(null);

  const sampleQueries = [
    { text: "Find the black shoes I saved last month", key: "shoes" },
    { text: "Find the restaurant I saved for my Goa trip", key: "goa" },
    { text: "Show me everything related to React", key: "react" },
    { text: "Find PDFs related to SSC preparation", key: "ssc" }
  ];

  const handleQueryClick = (text: string, key: string) => {
    setQuery(text);
    setActiveQueryKey(key);
    // Simulate short search delay
    setResults([]);
    setTimeout(() => {
      setResults(mockMemories[key] || []);
    }, 400);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Products': return <ShoppingBag className="h-4 w-4 text-amber-400" />;
      case 'Places': return <MapPin className="h-4 w-4 text-emerald-400" />;
      case 'Articles': return <Globe className="h-4 w-4 text-blue-400" />;
      default: return <FileText className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
      
      {/* Search Console Input */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            placeholder="Search your memory..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            readOnly
          />
        </div>
        <button className="rounded-lg bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors shrink-0">
          Search
        </button>
      </div>

      {/* Suggested prompts list */}
      <div className="mt-4 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Suggestions:</span>
        {sampleQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleQueryClick(q.text, q.key)}
            className={`rounded-full border border-slate-800 hover:border-slate-700 px-3 py-1 text-[10px] text-slate-400 hover:text-white transition-all ${
              activeQueryKey === q.key ? 'bg-blue-950/40 border-blue-500/40 text-blue-400' : ''
            }`}
          >
            {q.text}
          </button>
        ))}
      </div>

      {/* Results viewport */}
      <div className="mt-6 border-t border-slate-800/80 pt-6">
        {results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Search results ({results.length})</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <Sparkles className="h-3 w-3 animate-pulse" /> Semantic Match Active
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((item, idx) => (
                <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 transition-all flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                        {getCategoryIcon(item.category)}
                        {item.category}
                      </span>
                      <span className="text-[9px] text-slate-500">{item.date}</span>
                    </div>

                    {/* Title */}
                    <h5 className="text-xs font-bold text-white mt-3 flex items-center gap-1 hover:text-blue-400 cursor-pointer">
                      {item.title}
                    </h5>

                    {/* Domain */}
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Folder className="h-3 w-3" /> {item.domain}
                    </p>

                    {/* Summary */}
                    <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">{item.summary}</p>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-900 pt-3">
                    <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {item.relevance}% Match
                    </span>
                    <button className="flex items-center gap-1 text-[9px] text-blue-400 font-semibold hover:text-blue-300">
                      Open original <ExternalLink className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
            <Search className="h-8 w-8 text-slate-700 mb-3" />
            <p className="text-xs font-semibold text-slate-400">No active memory query</p>
            <p className="text-[10px] text-slate-600 mt-1">Select one of the sample search queries above to see results.</p>
          </div>
        )}
      </div>

    </div>
  );
}
