'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { registerUser, loginUser } from '@/app/actions/auth';
import { useApp } from '@/components/Providers';
import { BrainCircuit, Loader2, Sparkles, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useApp();
  const [isPending, startTransition] = useTransition();

  // Mode: login or register
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  // Onboarding step for registration
  const [step, setStep] = useState(1); // 1 = details, 2 = preferences (onboarding)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const interestsList = [
    'Products', 'Articles', 'Videos', 'Research', 'Travel', 
    'Recipes', 'Work', 'Study material', 'Ideas', 'Documents'
  ];

  // Sync mode with query params
  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsRegister(mode === 'register');
    setStep(1);
    setError('');
  }, [searchParams]);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isRegister && !name) {
      setError('Name is required to register.');
      return;
    }

    if (isRegister && step === 1) {
      // Move to onboarding step
      setStep(2);
      return;
    }

    startTransition(async () => {
      let res;
      if (isRegister) {
        res = await registerUser(email, password, name);
      } else {
        res = await loginUser(email, password);
      }

      if (res.success) {
        await refreshUser();
        router.push('/dashboard');
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
        // Reset step to 1 if register fails
        if (isRegister) setStep(1);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 dark:bg-[#090d16] text-foreground transition-all duration-300">
      
      {/* Background radial soft light */}
      <div className="absolute top-1/2 left-1/2 h-[350px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        
        {/* LOGO TITLE */}
        <div className="flex flex-col items-center text-center">
          <BrainCircuit className="h-10 w-10 text-primary mb-2 animate-pulse" />
          <h2 className="text-2xl font-bold tracking-tight">
            {isRegister ? 'Create your Recall Account' : 'Welcome back to Recall'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            {isRegister 
              ? 'Start building your secure, private digital memory.' 
              : 'Sign in to access your saved links, files, and notes.'}
          </p>
        </div>

        {/* AUTH BOX */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
          
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-500 font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* REGISTER STEP 1 OR LOGIN */}
            {(!isRegister || step === 1) && (
              <>
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted-foreground">Full Name</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">Password</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* REGISTER STEP 2 (ONBOARDING) */}
            {isRegister && step === 2 && (
              <div className="animate-fade-in space-y-4">
                <div className="flex items-center gap-1.5 text-primary text-xs font-bold mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span>Onboarding Personalization</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Select the types of content you plan to save. We will customize your initial categories, but you can always save everything.
                </p>

                <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
                  {interestsList.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-background hover:bg-slate-50 dark:hover:bg-slate-800 text-foreground'
                        }`}
                      >
                        <span>{interest}</span>
                        {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary hover:bg-blue-600 px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isRegister && step === 1 ? (
                <>Next: Customize <ArrowRight className="h-3.5 w-3.5" /></>
              ) : isRegister ? (
                'Complete Registration'
              ) : (
                'Sign In'
              )}
            </button>

            {/* Step back button */}
            {isRegister && step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-[10px] text-muted-foreground hover:underline font-semibold"
              >
                Go back to details
              </button>
            )}

          </form>

          {/* TOGGLE MODES */}
          <div className="mt-5 text-center text-[11px] text-muted-foreground">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <Link href="/auth?mode=login" className="font-semibold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/auth?mode=register" className="font-semibold text-primary hover:underline">
                  Register
                </Link>
              </p>
            )}
          </div>

        </div>

        {/* Back to Home Link */}
        <div className="text-center">
          <Link href="/" className="text-[10px] text-muted-foreground hover:text-foreground">
            ← Back to marketing site
          </Link>
        </div>

      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground dark:bg-[#090d16]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading authorization...</p>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
