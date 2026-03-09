"use client";

import { useState } from "react";
import {
  FileText, CheckSquare, Paperclip, Link2, Search, FileBox,
  MessageSquare, ClipboardList, ChevronRight
} from "lucide-react";

// ── Shared types & data ──────────────────────────────────────────────────────

type Tab = "details" | "tasks" | "attachments" | "links" | "investigation" | "documents" | "comments" | "audit";

const ALL_TABS: { key: Tab; label: string; icon: React.ElementType; group: string }[] = [
  { key: "details",       label: "Details",       icon: FileText,      group: "Core" },
  { key: "tasks",         label: "Tasks",         icon: CheckSquare,   group: "Core" },
  { key: "attachments",   label: "Attachments",   icon: Paperclip,     group: "Core" },
  { key: "links",         label: "Links",         icon: Link2,         group: "Investigation" },
  { key: "investigation", label: "Investigation", icon: Search,        group: "Investigation" },
  { key: "documents",     label: "Documents",     icon: FileBox,       group: "Investigation" },
  { key: "comments",      label: "Comments",      icon: MessageSquare, group: "Activity" },
  { key: "audit",         label: "Audit Log",     icon: ClipboardList, group: "Activity" },
];

// Logical ordering: Details first, then action items, investigation cluster, activity last
const ORDERED_TABS: typeof ALL_TABS = [
  ALL_TABS[0], // Details
  ALL_TABS[1], // Tasks
  ALL_TABS[2], // Attachments
  ALL_TABS[5], // Documents
  ALL_TABS[3], // Links
  ALL_TABS[4], // Investigation
  ALL_TABS[6], // Comments
  ALL_TABS[7], // Audit Log
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-slate-800 mb-3">{children}</h2>;
}

function Description({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500 mb-4">{children}</p>;
}

function FakeContent({ tab }: { tab: Tab }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 min-h-[120px] flex items-center justify-center text-slate-400 text-sm">
      {tab.charAt(0).toUpperCase() + tab.slice(1)} content area
    </div>
  );
}

// ── Layout A: Current (flat pills, no grouping) ─────────────────────────────

function LayoutA() {
  const [tab, setTab] = useState<Tab>("details");
  return (
    <div>
      <SectionLabel>A) Current — Flat Pills (no grouping)</SectionLabel>
      <Description>Current layout. All 8 tabs in a flat row with no logical grouping or icons.</Description>
      <div className="flex items-center gap-1 mb-4">
        {ALL_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              t.key === tab
                ? "bg-brand text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Layout B: Grouped Sections with Separators ──────────────────────────────

function LayoutB() {
  const [tab, setTab] = useState<Tab>("details");
  const groups = ["Core", "Investigation", "Activity"];
  return (
    <div>
      <SectionLabel>B) Grouped Pills with Separators</SectionLabel>
      <Description>
        Tabs reordered into 3 logical groups (Core / Investigation / Activity)
        with subtle dividers between groups. Icons help scanning.
      </Description>
      <div className="flex items-center gap-1 mb-4">
        {groups.map((group, gi) => (
          <div key={group} className="flex items-center gap-1">
            {gi > 0 && <div className="w-px h-5 bg-slate-300 mx-1.5" />}
            {ORDERED_TABS.filter(t => t.group === group).map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    t.key === tab
                      ? "bg-brand text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Layout C: Underline Tabs (classic) ──────────────────────────────────────

function LayoutC() {
  const [tab, setTab] = useState<Tab>("details");
  return (
    <div>
      <SectionLabel>C) Underline Tabs (reordered)</SectionLabel>
      <Description>
        Classic underline tab bar. Clean and familiar. Reordered logically with icons.
      </Description>
      <div className="border-b border-slate-200 mb-4">
        <div className="flex items-center gap-0 -mb-px">
          {ORDERED_TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  t.key === tab
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Layout D: Grouped Underline Tabs with Labels ────────────────────────────

function LayoutD() {
  const [tab, setTab] = useState<Tab>("details");
  const groups = ["Core", "Investigation", "Activity"];
  return (
    <div>
      <SectionLabel>D) Grouped Underline Tabs with Section Labels</SectionLabel>
      <Description>
        Underline tabs with small group labels above each section. Makes the grouping explicit.
      </Description>
      <div className="border-b border-slate-200 mb-4">
        <div className="flex items-end gap-0 -mb-px">
          {groups.map((group, gi) => (
            <div key={group} className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-4 mb-0.5">
                {group}
              </span>
              <div className="flex items-center">
                {gi > 0 && <div className="w-px h-6 bg-slate-200 mx-0.5 self-center mb-1" />}
                {ORDERED_TABS.filter(t => t.group === group).map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                        t.key === tab
                          ? "border-brand text-brand"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Layout E: Sidebar Navigation ────────────────────────────────────────────

function LayoutE() {
  const [tab, setTab] = useState<Tab>("details");
  const groups = ["Core", "Investigation", "Activity"];
  return (
    <div>
      <SectionLabel>E) Sidebar Navigation</SectionLabel>
      <Description>
        Vertical sidebar with grouped sections. Good for many tabs, gives room for future growth.
        Content area gets full width.
      </Description>
      <div className="flex gap-4">
        <div className="w-48 shrink-0">
          <div className="bg-white border border-slate-200 rounded-lg p-2 space-y-3">
            {groups.map(group => (
              <div key={group}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
                  {group}
                </div>
                {ORDERED_TABS.filter(t => t.group === group).map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        t.key === tab
                          ? "bg-brand/10 text-brand"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <FakeContent tab={tab} />
        </div>
      </div>
    </div>
  );
}

// ── Layout F: Segmented Control + Sub-tabs ──────────────────────────────────

function LayoutF() {
  const [section, setSection] = useState<"core" | "investigation" | "activity">("core");
  const [tab, setTab] = useState<Tab>("details");

  const sectionTabs: Record<string, typeof ALL_TABS> = {
    core: ORDERED_TABS.filter(t => t.group === "Core"),
    investigation: ORDERED_TABS.filter(t => t.group === "Investigation"),
    activity: ORDERED_TABS.filter(t => t.group === "Activity"),
  };

  function switchSection(s: typeof section) {
    setSection(s);
    setTab(sectionTabs[s][0].key);
  }

  return (
    <div>
      <SectionLabel>F) Segmented Control + Sub-tabs</SectionLabel>
      <Description>
        Top-level segmented control for groups, with sub-tabs inside each group.
        Reduces visual clutter — only 3-4 tabs visible at a time.
      </Description>
      {/* Segmented control */}
      <div className="inline-flex bg-slate-100 rounded-lg p-0.5 mb-3">
        {(["core", "investigation", "activity"] as const).map(s => (
          <button
            key={s}
            onClick={() => switchSection(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              s === section
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 mb-4">
        {sectionTabs[section].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                t.key === tab
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Layout G: Icon-only compact bar + label ─────────────────────────────────

function LayoutG() {
  const [tab, setTab] = useState<Tab>("details");
  const groups = ["Core", "Investigation", "Activity"];
  return (
    <div>
      <SectionLabel>G) Compact Icon Bar with Tooltip Labels</SectionLabel>
      <Description>
        Icon-heavy compact bar for minimal horizontal space. Active tab shows label.
        Groups separated by dividers.
      </Description>
      <div className="flex items-center gap-0.5 mb-4 bg-slate-100 rounded-lg p-1">
        {groups.map((group, gi) => (
          <div key={group} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-5 bg-slate-300 mx-1" />}
            {ORDERED_TABS.filter(t => t.group === group).map(t => {
              const Icon = t.icon;
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  title={t.label}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? "bg-white text-brand shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon size={15} />
                  {active && <span>{t.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Layout H: Breadcrumb-style ──────────────────────────────────────────────

function LayoutH() {
  const [tab, setTab] = useState<Tab>("details");
  return (
    <div>
      <SectionLabel>H) Breadcrumb / Step Navigation</SectionLabel>
      <Description>
        Tabs presented as a workflow progression. Good if the event record follows a natural
        left-to-right lifecycle: create → work → investigate → close.
      </Description>
      <div className="flex items-center mb-4 overflow-x-auto">
        {ORDERED_TABS.map((t, i) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <div key={t.key} className="flex items-center">
              {i > 0 && <ChevronRight size={14} className="text-slate-300 mx-0.5 shrink-0" />}
              <button
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-brand text-white"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            </div>
          );
        })}
      </div>
      <FakeContent tab={tab} />
    </div>
  );
}

// ── Test Page ────────────────────────────────────────────────────────────────

export default function EventNavTestPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Event Detail Navigation — Layout Test</h1>
          <p className="text-sm text-slate-500">
            8 tabs: Details, Tasks, Attachments, Documents, Links, Investigation, Comments, Audit Log.
            <br />
            Reordered into logical groups: <strong>Core</strong> (Details, Tasks, Attachments, Documents)
            → <strong>Investigation</strong> (Links, Investigation) → <strong>Activity</strong> (Comments, Audit).
          </p>
        </div>

        <LayoutA />
        <hr className="border-slate-200" />
        <LayoutB />
        <hr className="border-slate-200" />
        <LayoutC />
        <hr className="border-slate-200" />
        <LayoutD />
        <hr className="border-slate-200" />
        <LayoutE />
        <hr className="border-slate-200" />
        <LayoutF />
        <hr className="border-slate-200" />
        <LayoutG />
        <hr className="border-slate-200" />
        <LayoutH />
      </div>
    </div>
  );
}
