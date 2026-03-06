"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Truck, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { validateToken, setPassword } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

type TokenState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "valid"; type: string; email: string };

export function SetPasswordPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const token        = params.get("token") ?? "";
  const { loginWithResult } = useAuth();

  const [tokenState,   setTokenState]   = useState<TokenState>({ status: "loading" });
  const [password,     setPasswordVal]  = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    if (!token) { setTokenState({ status: "invalid" }); return; }
    validateToken(token)
      .then(res => {
        if (res.valid) {
          setTokenState({ status: "valid", type: res.type, email: res.email });
        } else {
          setTokenState({ status: "invalid" });
        }
      })
      .catch(() => setTokenState({ status: "invalid" }));
  }, [token]);

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 " +
    "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      const result = await setPassword(token, password);
      loginWithResult(result);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const heading =
    tokenState.status === "valid" && tokenState.type === "Invite"
      ? "Set your password to get started"
      : "Reset your password";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50 mb-4">
            <Truck size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ImperaOps</h1>
          {tokenState.status === "valid" && (
            <p className="text-slate-400 text-sm mt-1">{heading}</p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {tokenState.status === "loading" && (
            <p className="text-center text-slate-400 text-sm py-4">Verifying link…</p>
          )}

          {tokenState.status === "invalid" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-900/40 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-400" />
                </div>
              </div>
              <h2 className="text-white font-semibold text-lg">Link invalid or expired</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                This link has already been used or has expired. Request a new one below.
              </p>
              <Link
                href="/forgot-password"
                className="inline-block mt-2 px-4 py-2 bg-brand hover:bg-brand-hover text-brand-text text-sm font-semibold rounded-lg transition-colors"
              >
                Request a new link
              </Link>
            </div>
          )}

          {tokenState.status === "valid" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">{heading}</h2>
              {tokenState.email && (
                <p className="text-slate-400 text-sm mb-5">{tokenState.email}</p>
              )}

              {error && (
                <div className="flex items-start gap-2.5 mb-5 rounded-lg bg-red-950/50 border border-red-800/60 px-4 py-3 text-sm text-red-300">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPasswordVal(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoFocus
                      autoComplete="new-password"
                      className={inputCls + " pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm password</label>
                  <input
                    type={showPass ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-brand hover:bg-brand-hover
                             disabled:opacity-60 disabled:cursor-not-allowed text-brand-text text-sm font-semibold rounded-lg
                             transition-colors shadow-lg shadow-indigo-900/40"
                >
                  <CheckCircle2 size={16} />
                  {saving ? "Saving…" : "Set password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
