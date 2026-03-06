"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogIn, ShieldCheck, Truck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { verifyTotpChallenge } from "@/lib/api";

export function LoginPage() {
  const { login, loginWithResult } = useAuth();
  const router                     = useRouter();

  // Step 1 state
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Step 2 state (TOTP challenge)
  const [step,         setStep]         = useState<1 | 2>(1);
  const [pendingToken, setPendingToken] = useState("");
  const [totpCode,     setTotpCode]     = useState("");
  const totpInputRef = useRef<HTMLInputElement>(null);

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.totpRequired) {
        setPendingToken(result.pendingToken);
        setTotpCode("");
        setStep(2);
        setTimeout(() => totpInputRef.current?.focus(), 50);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await verifyTotpChallenge(pendingToken, totpCode);
      loginWithResult(result);
      router.push("/dashboard");
    } catch {
      setError("Invalid code. Please try again.");
      setTotpCode("");
      totpInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep(1);
    setError("");
    setTotpCode("");
    setPendingToken("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
            <Truck size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ImperaOps</h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1 ? "Sign in to your account" : "Two-factor authentication"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2.5 mb-5 rounded-lg bg-red-950/50 border border-red-800/60 px-4 py-3 text-sm text-red-300">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── Step 1: email + password ─── */}
          {step === 1 && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-400">Password</label>
                  <Link href="/forgot-password" className="text-xs text-brand hover:text-brand-hover transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-brand hover:bg-brand-hover
                           disabled:opacity-60 disabled:cursor-not-allowed text-brand-text text-sm font-semibold rounded-lg
                           transition-colors shadow-lg shadow-indigo-900/40"
              >
                <LogIn size={16} />
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}

          {/* ── Step 2: TOTP challenge ─── */}
          {step === 2 && (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div className="flex items-center gap-2.5 mb-1 px-3 py-3 rounded-lg bg-slate-800/60 border border-slate-700">
                <ShieldCheck size={16} className="text-brand shrink-0" />
                <p className="text-sm text-slate-300">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Authenticator code</label>
                <input
                  ref={totpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  required
                  autoComplete="one-time-code"
                  className={`${inputCls} tracking-[0.4em] text-center text-base`}
                />
              </div>

              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-brand hover:bg-brand-hover
                           disabled:opacity-60 disabled:cursor-not-allowed text-brand-text text-sm font-semibold rounded-lg
                           transition-colors shadow-lg shadow-indigo-900/40"
              >
                <ShieldCheck size={16} />
                {loading ? "Verifying…" : "Verify"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mt-1"
              >
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
