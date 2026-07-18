'use server';

import Link from 'next/link';
import { 
  BrainCircuit, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Zap, 
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Laptop,
  X
} from 'lucide-react';
import LandingDemo from '@/components/LandingDemo';

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-blue-500 selection:text-white">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Recall
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/auth"
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth?mode=register"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:translate-y-[-1px]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative px-4 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute top-1/4 left-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400 font-semibold mb-6 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Digital Memory
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-white">
            Remember anything you <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              save. Forget the rest.
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-md md:text-lg text-slate-400 leading-relaxed">
            The ultimate universal &quot;Save &amp; Find Later&quot; platform. Paste links, upload screenshots, PDFs, and notes. Instantly find them using natural language.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/auth?mode=register"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-blue-600/30 transition-all hover:scale-102 hover:translate-y-[-1px]"
            >
              Start Remembering
            </Link>
            <a
              href="#demo"
              className="rounded-lg border border-slate-700 bg-slate-800/40 hover:bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-all"
            >
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* INTERACTIVE DEMO COMPONENT */}
      <section id="demo" className="border-t border-b border-slate-800 bg-slate-950/40 py-16 px-4">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white">Experience Semantic Search</h2>
            <p className="text-sm text-slate-400 mt-2">Click one of the search queries to witness how Recall locates matching memories</p>
          </div>
          
          <LandingDemo />
        </div>
      </section>

      {/* THE PROBLEM & HOW IT WORKS */}
      <section className="mx-auto max-w-6xl py-20 px-4 space-y-24">
        
        {/* Core Problem */}
        <div className="grid gap-10 md:grid-cols-2 items-center">
          <div>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">
              Bookmarks are broken. <br />Notes are a mess.
            </h3>
            <p className="mt-4 text-slate-400 leading-relaxed">
              We save useful links, products, travel locations, and PDFs across WhatsApp, screenshots, browser folders, and spreadsheets. When we need them weeks later, we spend hours searching.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "Browser bookmarks are static and easily forgotten.",
                "Screenshots sit uselessly in your photo roll.",
                "Folder-based organization requires constant manual work."
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <X className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-inner">
            <h4 className="font-semibold text-white mb-4">Recall's Solution: AI-First Curation</h4>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="rounded bg-blue-500/10 p-2 text-blue-400 h-9 w-9 shrink-0 flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="text-sm font-semibold text-white">Save Instantly</p>
                  <p className="text-xs text-slate-400">Paste a link, write a note, or upload screenshots on any device.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded bg-blue-500/10 p-2 text-blue-400 h-9 w-9 shrink-0 flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="text-sm font-semibold text-white">AI Processing</p>
                  <p className="text-xs text-slate-400">Recall performs OCR, auto-summarizes, generates tags, and creates semantic vectors.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded bg-blue-500/10 p-2 text-blue-400 h-9 w-9 shrink-0 flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="text-sm font-semibold text-white">Natural Search</p>
                  <p className="text-xs text-slate-400">Ask &quot;What was that AI article I saved?&quot; and let Recall find it in milliseconds.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "SSRF Protected Captures",
              desc: "A secure server ingestion pipeline that shields local subnets while safely extracting website OpenGraph metadata.",
              icon: ShieldCheck,
            },
            {
              title: "Multimodal OCR Pipeline",
              desc: "Upload images, designs, and product photos. Recall reads text within images to make screenshots completely searchable.",
              icon: Sparkles,
            },
            {
              title: "Smart Folders & Collections",
              desc: "Recall automatically organizes memories into dynamic views like Products, Places, Articles, Documents, and Favorites.",
              icon: Zap,
            }
          ].map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-blue-500/40 hover:bg-slate-900 transition-all duration-300">
                <div className="rounded-lg bg-blue-500/10 text-blue-400 p-2.5 h-10 w-10 mb-4 flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-md font-semibold text-white">{feat.title}</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>

      </section>

      {/* PRIVACY FIRST */}
      <section className="bg-slate-950/60 border-t border-b border-slate-800 py-20 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white">Your Memory is Private. Period.</h3>
          <p className="text-slate-400 mt-4 leading-relaxed max-w-2xl mx-auto">
            Because a personal digital memory contains highly sensitive information, privacy is at the core of Recall. We enforce absolute database isolation. You can export or permanently delete your account data at any time from our Privacy Center.
          </p>
          <div className="mt-8 flex justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Complete Isolation</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> GDPR Data Export</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Secure Transit Encryption</span>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="mx-auto max-w-4xl py-20 px-4">
        <h3 className="text-2xl font-bold text-center text-white mb-10">Frequently Asked Questions</h3>
        <div className="space-y-6">
          {[
            {
              q: "How does the AI search find my bookmarks?",
              a: "Recall uses vector embeddings to map your saved items into a multi-dimensional semantic space. When you search using natural language (e.g. 'black shoes'), our system calculates the similarity to your saved memories, returning matches based on concept rather than just exact keywords."
            },
            {
              q: "Can I use Recall offline or without an API key?",
              a: "Yes! Recall has an intelligent offline mode. If you don't configure a Gemini API key, Recall uses an advanced local fallback parsing system that auto-categorizes content and generates deterministic embeddings so you can still search and tag items immediately."
            },
            {
              q: "Is there a browser extension or share sheet integration?",
              a: "Recall is designed as a PWA, which acts as a Web Share Target on Android and Desktop. Our architecture is also extension-ready, allowing direct bookmarks to be securely ingested via our API endpoint."
            }
          ].map((faq, i) => (
            <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
              <p className="font-semibold text-white flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                {faq.q}
              </p>
              <p className="text-xs text-slate-400 mt-2 pl-6.5 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-4">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-blue-500" />
            <span className="font-bold text-sm tracking-tight text-white">Recall App</span>
          </div>
          <p className="text-[10px] text-slate-500">© 2026 Recall Inc. Designed for private digital productivity. Built with Next.js &amp; SQLite.</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link href="/auth" className="hover:text-white">Sign In</Link>
            <span className="text-slate-800">|</span>
            <Link href="/auth?mode=register" className="hover:text-white">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
