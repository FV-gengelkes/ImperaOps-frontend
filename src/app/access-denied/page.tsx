"use client";

import Link from "next/link";
import { ShieldOff, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 border border-red-100 mb-5">
          <ShieldOff size={28} className="text-critical" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          You don&apos;t have permission to view this resource. It may belong to a different
          client, or you may not have the required role.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={from ?? "/events/list"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-text text-sm font-medium hover:bg-brand-hover transition-colors"
          >
            <ArrowLeft size={14} />
            Go back
          </Link>
          <Link
            href="/events/list"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Events list
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense>
      <AccessDeniedContent />
    </Suspense>
  );
}
