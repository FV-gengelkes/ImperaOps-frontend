"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { Avatar } from "./profile-shared";
import { ProfileInfoCard } from "./profile-info-card";
import { PasswordCard } from "./password-card";
import { TotpCard } from "./totp-card";
import { SessionsCard } from "./sessions-card";
import { NotificationPreferencesCard } from "./notifications-card";

type ProfileTab = "account" | "security" | "notifications";

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: "account",       label: "Account"       },
  { key: "security",      label: "Security"      },
  { key: "notifications", label: "Notifications" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ProfileTab>("account");

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={user?.displayName ?? ""} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-steel-white">{user?.displayName || "My Profile"}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user?.email}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6">
        {PROFILE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              t.key === tab
                ? "bg-brand text-brand-text"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {tab === "account" && (
          <>
            <ProfileInfoCard />
            <PasswordCard />
          </>
        )}
        {tab === "security" && (
          <>
            <TotpCard />
            <SessionsCard />
          </>
        )}
        {tab === "notifications" && <NotificationPreferencesCard />}
      </div>
    </div>
  );
}
