"use client";


export type Module = {
  key: string;
  label: string;
};

export const ALL_MODULES: Module[] = [
  { key: "incidents", label: "Events" },
];

export function ModuleTabs({
  activeModule,
  onChange,
}: {
  activeModule: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-6">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
        Module
      </span>
      {ALL_MODULES.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            m.key === activeModule
              ? "bg-brand text-brand-text"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
