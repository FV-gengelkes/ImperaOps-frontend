"use client";

import { useState } from "react";
import Link from "next/link";
import { Truck, ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { forgotPassword } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <p className="text-slate-400 text-sm mt-1">Reset your password</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-900/40 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={24} className="text-green-400" />
                </div>
              </div>
              <h2 className="text-white font-semibold text-lg">Check your inbox</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                If that email address is registered, we&apos;ve sent a link to reset your password.
                The link expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors mt-2"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 mb-5 rounded-lg bg-red-950/50 border border-red-800/60 px-4 py-3 text-sm text-red-300">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoFocus
                    autoComplete="email"
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
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
