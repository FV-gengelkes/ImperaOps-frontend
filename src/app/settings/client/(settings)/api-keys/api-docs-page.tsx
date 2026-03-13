"use client";

import { useState } from "react";
import { Book, ChevronDown, ChevronRight, Copy, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white transition"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

// ── Code Block ───────────────────────────────────────────────────────────────

function Code({ children, title }: { children: string; title?: string }) {
  return (
    <div className="relative">
      {title && <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-4 py-1.5 rounded-t-lg border-b border-slate-700">{title}</div>}
      <pre className={`text-xs bg-slate-900 text-slate-200 p-4 overflow-x-auto ${title ? "rounded-b-lg" : "rounded-lg"}`}>
        <code>{children.trim()}</code>
      </pre>
      <CopyButton text={children.trim()} />
    </div>
  );
}

// ── Inline code ──────────────────────────────────────────────────────────────

function C({ children }: { children: React.ReactNode }) {
  return <code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">{children}</code>;
}

// ── Collapsible Section ──────────────────────────────────────────────────────

function Section({ id, title, defaultOpen = false, children }: { id: string; title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── Method Badge ─────────────────────────────────────────────────────────────

function Method({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700",
    POST: "bg-green-100 text-green-700",
    PUT: "bg-amber-100 text-amber-700",
    PATCH: "bg-purple-100 text-purple-700",
    DELETE: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${colors[method] ?? "bg-slate-100 text-slate-600"}`}>
      {method}
    </span>
  );
}

// ── Endpoint Row ─────────────────────────────────────────────────────────────

function Endpoint({ method, path, scope, description }: { method: string; path: string; scope: string; description: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <Method method={method} />
      <div className="flex-1 min-w-0">
        <code className="text-xs font-mono text-slate-800 break-all">{path}</code>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full bg-brand/10 text-brand">{scope}</span>
    </div>
  );
}

// ── Param Table ──────────────────────────────────────────────────────────────

function ParamTable({ params }: { params: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 pr-3 font-semibold text-slate-600">Field</th>
            <th className="text-left py-2 pr-3 font-semibold text-slate-600">Type</th>
            <th className="text-left py-2 pr-3 font-semibold text-slate-600">Required</th>
            <th className="text-left py-2 font-semibold text-slate-600">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map(p => (
            <tr key={p.name} className="border-b border-slate-50">
              <td className="py-2 pr-3 font-mono text-slate-800">{p.name}</td>
              <td className="py-2 pr-3 text-slate-500">{p.type}</td>
              <td className="py-2 pr-3">{p.required ? <span className="text-red-500 font-medium">Yes</span> : <span className="text-slate-400">No</span>}</td>
              <td className="py-2 text-slate-600">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  return (
    <div className="pt-10 pl-8 pr-8 pb-8 max-w-3xl">
      {/* Back link */}
      <Link
        href="/settings/client/api-keys"
        className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to API Keys
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand">
          <Book className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Public API Documentation</h1>
      </div>
      <p className="text-slate-500 mb-4">
        Use the ImperaOps Public API to create, update, and read events from external systems like monitoring tools,
        ticketing platforms, and custom integrations.
      </p>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          ["#authentication", "Authentication"],
          ["#base-url", "Base URL"],
          ["#endpoints", "Endpoints"],
          ["#create-event", "Create Event"],
          ["#upsert-event", "Upsert Event"],
          ["#update-event", "Update Event"],
          ["#get-event", "Get Event"],
          ["#timeline", "Timeline"],
          ["#metadata", "Metadata"],
          ["#errors", "Errors"],
          ["#rate-limits", "Rate Limits"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="px-2.5 py-1 text-xs font-medium rounded-full border border-slate-200 text-slate-600 hover:border-brand hover:text-brand transition-colors">
            {label}
          </a>
        ))}
      </div>

      <div className="space-y-4">
        {/* ── Authentication ────────────────────────────────────────────────── */}
        <Section id="authentication" title="Authentication" defaultOpen>
          <p className="text-sm text-slate-600">
            All API requests require a Bearer token in the <C>Authorization</C> header.
            You can create API keys from the{" "}
            <Link href="/settings/client/api-keys" className="text-brand hover:underline">API Keys</Link>{" "}
            settings page.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>Important:</strong> Your API secret is only shown once when you create a key. Copy it immediately and store it securely.
              ImperaOps cannot retrieve your secret after creation.
            </p>
          </div>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Header Format</h3>
          <Code>{`Authorization: Bearer {clientSid}.{keyId}.{secret}`}</Code>

          <p className="text-sm text-slate-600">
            The complete authorization header value is shown when you create a new API key. It combines three parts separated by dots:
          </p>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
            <li><C>clientSid</C> — Your organization identifier</li>
            <li><C>keyId</C> — The public key identifier (e.g. <C>key_7h3k2m9x4p8q</C>)</li>
            <li><C>secret</C> — The private secret (e.g. <C>sk_live_abc123...</C>)</li>
          </ul>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Scopes</h3>
          <p className="text-sm text-slate-600">
            Each API key is assigned one or more scopes that control access:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-3 font-semibold text-slate-600">Scope</th>
                  <th className="text-left py-2 font-semibold text-slate-600">Permissions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-mono text-slate-800">events:create</td>
                  <td className="py-2 text-slate-600">Create new events</td>
                </tr>
                <tr className="border-b border-slate-50">
                  <td className="py-2 pr-3 font-mono text-slate-800">events:read</td>
                  <td className="py-2 text-slate-600">Read event details, list event types and statuses</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-mono text-slate-800">events:update</td>
                  <td className="py-2 text-slate-600">Update existing events and add timeline entries</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Base URL ──────────────────────────────────────────────────────── */}
        <Section id="base-url" title="Base URL" defaultOpen>
          <p className="text-sm text-slate-600">All API endpoints use the following base URL:</p>
          <Code>{`https://imperaops.com/public/v1`}</Code>
          <p className="text-sm text-slate-600">
            All requests must use HTTPS. The <C>Content-Type</C> header should be set to <C>application/json</C> for request bodies.
          </p>
        </Section>

        {/* ── Endpoints Overview ────────────────────────────────────────────── */}
        <Section id="endpoints" title="Endpoints Overview" defaultOpen>
          <Endpoint method="POST" path="/public/v1/events" scope="events:create" description="Create a new event" />
          <Endpoint method="PUT" path="/public/v1/events/external/{externalId}" scope="events:update" description="Create or update event by external ID (upsert)" />
          <Endpoint method="PATCH" path="/public/v1/events/{eventId}" scope="events:update" description="Update an existing event" />
          <Endpoint method="GET" path="/public/v1/events/{eventId}" scope="events:read" description="Get event details by public ID" />
          <Endpoint method="POST" path="/public/v1/events/{eventId}/timeline" scope="events:update" description="Add a timeline entry to an event" />
          <Endpoint method="GET" path="/public/v1/events/meta/types" scope="events:read" description="List available event types" />
          <Endpoint method="GET" path="/public/v1/events/meta/statuses" scope="events:read" description="List available workflow statuses" />
        </Section>

        {/* ── Create Event ──────────────────────────────────────────────────── */}
        <Section id="create-event" title="Create Event">
          <div className="flex items-center gap-2 mb-2">
            <Method method="POST" />
            <code className="text-sm font-mono text-slate-800">/public/v1/events</code>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Creates a new event in ImperaOps. Returns the created event with its assigned public ID (e.g. <C>EVT-0042</C>).
          </p>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Request Body</h3>
          <ParamTable params={[
            { name: "title", type: "string", required: true, description: "Short summary of the event" },
            { name: "type", type: "string", required: true, description: "Event type name (e.g. \"Incident\", \"Near Miss\")" },
            { name: "severity", type: "string", required: true, description: "One of: low, medium, high, critical" },
            { name: "source", type: "string", required: true, description: "Origin system identifier (e.g. \"pagerduty\", \"datadog\")" },
            { name: "externalId", type: "string", required: false, description: "Your system's unique ID for deduplication" },
            { name: "service", type: "string", required: false, description: "Affected service name" },
            { name: "status", type: "string", required: false, description: "Workflow status name (defaults to first open status)" },
            { name: "description", type: "string", required: false, description: "Detailed description of the event" },
            { name: "detectedAt", type: "ISO 8601", required: false, description: "When the event was detected (defaults to now)" },
            { name: "metadata", type: "object", required: false, description: "Key-value pairs for additional context" },
            { name: "tags", type: "string[]", required: false, description: "Tags for categorization" },
          ]} />

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mt-4">Example</h3>
          <Code title="Request">{`curl -X POST https://imperaops.com/public/v1/events \\
  -H "Authorization: Bearer csid_abc123.key_7h3k2m9x.sk_live_secret..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Database connection pool exhausted",
    "type": "Incident",
    "severity": "high",
    "source": "datadog",
    "externalId": "alert-98765",
    "service": "api-gateway",
    "description": "Connection pool reached 100% utilization on primary DB.",
    "metadata": {
      "environment": "production",
      "region": "us-east-1",
      "pool_size": 50
    },
    "tags": ["database", "performance"]
  }'`}</Code>

          <Code title="Response — 201 Created">{`{
  "id": "EVT-0042",
  "status": "Open",
  "clientSid": "csid_abc123",
  "title": "Database connection pool exhausted",
  "type": "Incident",
  "severity": "high",
  "source": "datadog",
  "externalId": "alert-98765",
  "service": "api-gateway",
  "description": "Database connection pool exhausted\\n\\nService: api-gateway\\n\\nMetadata:\\n- environment: production\\n- region: us-east-1\\n- pool_size: 50\\n\\nTags: database, performance",
  "createdAt": "2026-03-13T12:00:00.0000000+00:00",
  "updatedAt": "2026-03-13T12:00:00.0000000+00:00"
}`}</Code>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Deduplication:</strong> If an event with the same <C>source</C> and <C>externalId</C> already exists,
              the API returns <C>200 OK</C> with the existing event instead of creating a duplicate.
            </p>
          </div>
        </Section>

        {/* ── Upsert Event ──────────────────────────────────────────────────── */}
        <Section id="upsert-event" title="Upsert Event (by External ID)">
          <div className="flex items-center gap-2 mb-2">
            <Method method="PUT" />
            <code className="text-sm font-mono text-slate-800">/public/v1/events/external/&#123;externalId&#125;</code>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Creates a new event if no matching <C>externalId</C> exists for the source, or updates the existing event if one is found.
            This is ideal for integrations that send repeated alerts for the same issue.
          </p>
          <p className="text-sm text-slate-600 mb-3">
            Uses the same request body as <a href="#create-event" className="text-brand hover:underline">Create Event</a>.
            Requires <C>events:update</C> scope (plus <C>events:create</C> if the event doesn&apos;t exist yet).
          </p>

          <Code title="Example">{`curl -X PUT https://imperaops.com/public/v1/events/external/alert-98765 \\
  -H "Authorization: Bearer csid_abc123.key_7h3k2m9x.sk_live_secret..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Database connection pool exhausted",
    "type": "Incident",
    "severity": "critical",
    "source": "datadog"
  }'`}</Code>
        </Section>

        {/* ── Update Event ──────────────────────────────────────────────────── */}
        <Section id="update-event" title="Update Event">
          <div className="flex items-center gap-2 mb-2">
            <Method method="PATCH" />
            <code className="text-sm font-mono text-slate-800">/public/v1/events/&#123;eventId&#125;</code>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Updates an existing event by its public ID (e.g. <C>EVT-0042</C>). Only provided fields are updated.
          </p>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Request Body</h3>
          <ParamTable params={[
            { name: "status", type: "string", required: false, description: "New workflow status name (e.g. \"In Progress\", \"Resolved\")" },
            { name: "description", type: "string", required: false, description: "Updated description" },
            { name: "metadata", type: "object", required: false, description: "Additional metadata to merge" },
          ]} />

          <Code title="Example">{`curl -X PATCH https://imperaops.com/public/v1/events/EVT-0042 \\
  -H "Authorization: Bearer csid_abc123.key_7h3k2m9x.sk_live_secret..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "Resolved",
    "description": "Pool exhaustion resolved after scaling to 100 connections."
  }'`}</Code>

          <Code title="Response — 200 OK">{`{
  "id": "EVT-0042",
  "status": "Resolved",
  "title": "Database connection pool exhausted",
  "type": "Incident",
  "severity": "high",
  "source": "datadog",
  "externalId": "alert-98765",
  "updatedAt": "2026-03-13T12:15:00.0000000+00:00"
}`}</Code>
        </Section>

        {/* ── Get Event ─────────────────────────────────────────────────────── */}
        <Section id="get-event" title="Get Event">
          <div className="flex items-center gap-2 mb-2">
            <Method method="GET" />
            <code className="text-sm font-mono text-slate-800">/public/v1/events/&#123;eventId&#125;</code>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Retrieves an event by its public ID.
          </p>
          <Code title="Example">{`curl https://imperaops.com/public/v1/events/EVT-0042 \\
  -H "Authorization: Bearer csid_abc123.key_7h3k2m9x.sk_live_secret..."`}</Code>
        </Section>

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        <Section id="timeline" title="Add Timeline Entry">
          <div className="flex items-center gap-2 mb-2">
            <Method method="POST" />
            <code className="text-sm font-mono text-slate-800">/public/v1/events/&#123;eventId&#125;/timeline</code>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Adds a note or comment to an event&apos;s audit timeline. Useful for posting automated status updates from external systems.
          </p>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Request Body</h3>
          <ParamTable params={[
            { name: "message", type: "string", required: true, description: "The timeline entry content" },
            { name: "entryType", type: "string", required: false, description: "Entry type: \"note\" (default) or \"comment\"" },
            { name: "occurredAt", type: "ISO 8601", required: false, description: "Custom timestamp (defaults to now)" },
            { name: "metadata", type: "object", required: false, description: "Additional key-value context" },
          ]} />

          <Code title="Example">{`curl -X POST https://imperaops.com/public/v1/events/EVT-0042/timeline \\
  -H "Authorization: Bearer csid_abc123.key_7h3k2m9x.sk_live_secret..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Auto-scaling triggered: pool increased from 50 to 100 connections.",
    "entryType": "note"
  }'`}</Code>
        </Section>

        {/* ── Metadata Endpoints ────────────────────────────────────────────── */}
        <Section id="metadata" title="Metadata Endpoints">
          <p className="text-sm text-slate-600 mb-3">
            Use these endpoints to discover valid event types and workflow statuses for your organization.
            The <C>type</C> and <C>status</C> fields in event requests must match names returned by these endpoints.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Method method="GET" />
                <code className="text-xs font-mono text-slate-800">/public/v1/events/meta/types</code>
              </div>
              <Code title="Response">{`[
  { "id": 1, "name": "Incident" },
  { "id": 2, "name": "Near Miss" },
  { "id": 3, "name": "Hazard Report" }
]`}</Code>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Method method="GET" />
                <code className="text-xs font-mono text-slate-800">/public/v1/events/meta/statuses</code>
              </div>
              <Code title="Response">{`[
  { "id": 1, "name": "Open", "isClosed": false },
  { "id": 2, "name": "In Progress", "isClosed": false },
  { "id": 3, "name": "Resolved", "isClosed": true },
  { "id": 4, "name": "Closed", "isClosed": true }
]`}</Code>
            </div>
          </div>
        </Section>

        {/* ── Errors ────────────────────────────────────────────────────────── */}
        <Section id="errors" title="Error Handling">
          <p className="text-sm text-slate-600 mb-3">
            The API returns errors in a consistent JSON format with an error code, message, and request ID for troubleshooting.
          </p>

          <Code title="Error Response Format">{`{
  "error": {
    "code": "validation_failed",
    "message": "Title is required."
  },
  "requestId": "0HN8A1B2C3D4E:00000001"
}`}</Code>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mt-4">Error Codes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-3 font-semibold text-slate-600">HTTP Status</th>
                  <th className="text-left py-2 pr-3 font-semibold text-slate-600">Code</th>
                  <th className="text-left py-2 font-semibold text-slate-600">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["400", "invalid_request", "Malformed request body or missing Content-Type"],
                  ["400", "validation_failed", "One or more fields failed validation"],
                  ["401", "invalid_credentials", "Missing, malformed, or invalid API key"],
                  ["401", "credential_revoked", "API key has been revoked"],
                  ["401", "credential_expired", "API key has passed its expiration date"],
                  ["403", "insufficient_scope", "API key lacks the required scope for this endpoint"],
                  ["404", "not_found", "Event or resource not found"],
                  ["409", "conflict", "Conflict with existing resource"],
                  ["429", "rate_limited", "Too many requests — slow down and retry"],
                  ["500", "internal_error", "Unexpected server error — contact support"],
                ].map(([status, code, desc]) => (
                  <tr key={code} className="border-b border-slate-50">
                    <td className="py-2 pr-3 font-mono text-slate-800">{status}</td>
                    <td className="py-2 pr-3 font-mono text-slate-800">{code}</td>
                    <td className="py-2 text-slate-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Rate Limits ───────────────────────────────────────────────────── */}
        <Section id="rate-limits" title="Rate Limits">
          <p className="text-sm text-slate-600 mb-3">
            The API enforces rate limits per API credential to ensure fair usage:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-3 font-semibold text-slate-600">Limit</th>
                  <th className="text-left py-2 font-semibold text-slate-600">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-50">
                  <td className="py-2 pr-3 text-slate-800">Per credential</td>
                  <td className="py-2 text-slate-600">300 requests per minute</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 text-slate-800">Per organization</td>
                  <td className="py-2 text-slate-600">1,000 requests per minute</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 mt-3">
            When you exceed the limit, the API returns <C>429 Too Many Requests</C>.
            Implement exponential backoff in your integration to handle this gracefully.
          </p>
        </Section>

        {/* ── Quick Start Examples ───────────────────────────────────────────── */}
        <Section id="examples" title="Integration Examples">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Python</h3>
          <Code title="python">{`import requests

API_URL = "https://imperaops.com/public/v1"
HEADERS = {
    "Authorization": "Bearer csid_abc123.key_7h3k2m9x.sk_live_secret...",
    "Content-Type": "application/json",
}

# Create an event
resp = requests.post(f"{API_URL}/events", headers=HEADERS, json={
    "title": "Server CPU spike above 95%",
    "type": "Incident",
    "severity": "high",
    "source": "prometheus",
    "externalId": "prom-alert-12345",
    "service": "web-server-01",
    "metadata": {"cpu_percent": 97.3, "duration_minutes": 15},
})

event = resp.json()
print(f"Created event: {event['id']}")

# Add a timeline update later
requests.post(
    f"{API_URL}/events/{event['id']}/timeline",
    headers=HEADERS,
    json={"message": "CPU returned to normal levels (45%)."},
)

# Resolve the event
requests.patch(
    f"{API_URL}/events/{event['id']}",
    headers=HEADERS,
    json={"status": "Resolved"},
)`}</Code>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mt-4">JavaScript / Node.js</h3>
          <Code title="javascript">{`const API_URL = "https://imperaops.com/public/v1";
const API_KEY = "Bearer csid_abc123.key_7h3k2m9x.sk_live_secret...";

async function createEvent(data) {
  const res = await fetch(\`\${API_URL}/events\`, {
    method: "POST",
    headers: {
      "Authorization": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(\`\${err.error.code}: \${err.error.message}\`);
  }

  return res.json();
}

// Usage
const event = await createEvent({
  title: "Payment gateway timeout",
  type: "Incident",
  severity: "critical",
  source: "stripe-webhook",
  externalId: "evt_1234567890",
});

console.log("Created:", event.id);`}</Code>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mt-4">PowerShell</h3>
          <Code title="powershell">{`$headers = @{
    "Authorization" = "Bearer csid_abc123.key_7h3k2m9x.sk_live_secret..."
    "Content-Type"  = "application/json"
}

$body = @{
    title    = "Backup job failed"
    type     = "Incident"
    severity = "high"
    source   = "veeam"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://imperaops.com/public/v1/events" \`
    -Method POST -Headers $headers -Body $body

Write-Host "Created event: $($response.id)"`}</Code>
        </Section>

        {/* ── Idempotency ───────────────────────────────────────────────────── */}
        <Section id="idempotency" title="Idempotency & Deduplication">
          <p className="text-sm text-slate-600 mb-3">
            The API supports two deduplication strategies to prevent duplicate events:
          </p>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">1. External ID Deduplication</h3>
          <p className="text-sm text-slate-600 mb-3">
            If you include both <C>source</C> and <C>externalId</C> in a create request, the API checks for an existing event
            with the same combination. If found, it returns <C>200 OK</C> with the existing event instead of creating a duplicate.
          </p>

          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">2. Idempotency Key Header</h3>
          <p className="text-sm text-slate-600 mb-3">
            You can also send an <C>Idempotency-Key</C> header with a unique value (e.g. a UUID). The API uses this to detect
            retried requests and return the original response.
          </p>
          <Code>{`curl -X POST https://imperaops.com/public/v1/events \\
  -H "Authorization: Bearer ..." \\
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \\
  -H "Content-Type: application/json" \\
  -d '{ ... }'`}</Code>
        </Section>
      </div>
    </div>
  );
}
