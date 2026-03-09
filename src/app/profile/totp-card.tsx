"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Loader2, QrCode, ShieldCheck, ShieldOff } from "lucide-react";
import { disableTotp, getTotpStatus, setupTotp, verifyTotpSetup } from "@/lib/api";
import { useToast } from "@/components/toast-context";
import { LABEL, inputCls, ErrorBanner, PasswordInput } from "./profile-shared";

export function TotpCard() {
  const toast = useToast();

  const [loading,      setLoading]      = useState(true);
  const [isEnabled,    setIsEnabled]    = useState(false);
  const [setupData,    setSetupData]    = useState<{ secret: string; qrCodeUri: string } | null>(null);
  const [activateCode, setActivateCode] = useState("");
  const [activating,   setActivating]   = useState(false);
  const [activateErr,  setActivateErr]  = useState("");
  const [showDisable,  setShowDisable]  = useState(false);
  const [disablePass,  setDisablePass]  = useState("");
  const [disabling,    setDisabling]    = useState(false);
  const [disableErr,   setDisableErr]   = useState("");
  const [startingSetup, setStartingSetup] = useState(false);

  useEffect(() => {
    getTotpStatus()
      .then(r => setIsEnabled(r.isTotpEnabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStartSetup() {
    setStartingSetup(true);
    setSetupData(null);
    setActivateCode("");
    setActivateErr("");
    try {
      const data = await setupTotp();
      setSetupData(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start setup.");
    } finally {
      setStartingSetup(false);
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setActivateErr("");
    setActivating(true);
    try {
      await verifyTotpSetup(activateCode);
      setIsEnabled(true);
      setSetupData(null);
      setActivateCode("");
      toast.success("Two-factor authentication enabled");
    } catch (e: any) {
      setActivateErr(e?.message?.includes("Invalid") ? "Invalid code. Please try again." : (e?.message ?? "Verification failed."));
    } finally {
      setActivating(false);
    }
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setDisableErr("");
    setDisabling(true);
    try {
      await disableTotp(disablePass);
      setIsEnabled(false);
      setShowDisable(false);
      setDisablePass("");
      toast.success("Two-factor authentication disabled");
    } catch (e: any) {
      setDisableErr(e?.message?.includes("incorrect") ? "Password is incorrect." : (e?.message ?? "Failed to disable 2FA."));
    } finally {
      setDisabling(false);
    }
  }


  return (
    <div className="bg-white dark:bg-graphite rounded-2xl border border-slate-200 dark:border-slate-line shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck size={15} className="text-slate-400" />
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Two-Factor Authentication</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 size={14} className="animate-spin" /> Loading...
        </div>
      ) : isEnabled ? (
        /* ── Enabled state ── */
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
              <CheckCircle2 size={11} /> Enabled
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Authenticator app is protecting your account.</p>
          </div>
          {!showDisable ? (
            <button
              onClick={() => { setShowDisable(true); setDisableErr(""); setDisablePass(""); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-red-300 dark:border-red-700/60 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <ShieldOff size={14} /> Disable 2FA
            </button>
          ) : (
            <form onSubmit={handleDisable} className="space-y-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Confirm your password to disable 2FA</p>
              <PasswordInput
                value={disablePass}
                onChange={setDisablePass}
                placeholder="Current password"
                autoComplete="current-password"
              />
              {disableErr && <ErrorBanner message={disableErr} />}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={disabling || !disablePass}
                  className="px-4 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {disabling ? "Disabling..." : "Disable 2FA"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisable(false); setDisableErr(""); }}
                  className="px-4 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* ── Disabled state ── */
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
              Not enabled
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add extra security to your account.</p>
          </div>

          {!setupData ? (
            <button
              onClick={handleStartSetup}
              disabled={startingSetup}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <QrCode size={14} />
              {startingSetup ? "Loading..." : "Set up authenticator app"}
            </button>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-midnight border border-slate-200 dark:border-slate-line">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex gap-4 items-start">
                  {/* QR code */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white p-2 shrink-0">
                    <QRCodeSVG value={setupData.qrCodeUri} size={150} />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Or enter this key manually:</p>
                    <code className="block break-all text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 select-all">
                      {setupData.secret}
                    </code>
                  </div>
                </div>
              </div>

              <form onSubmit={handleActivate} className="space-y-3">
                <div>
                  <label className={LABEL}>Enter the 6-digit code to activate</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={activateCode}
                    onChange={e => setActivateCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    required
                    className={`${inputCls()} tracking-[0.35em] text-center`}
                    autoComplete="one-time-code"
                  />
                </div>
                {activateErr && <ErrorBanner message={activateErr} />}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={activating || activateCode.length !== 6}
                    className="px-4 py-2 text-sm font-semibold bg-brand text-brand-text rounded-lg hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {activating ? "Activating..." : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSetupData(null); setActivateCode(""); setActivateErr(""); }}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
