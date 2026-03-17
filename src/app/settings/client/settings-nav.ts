import { Clock, Database, FileText, Key, Mail, Sliders, Users, Webhook, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MinRole = "Manager" | "Admin";

export type SettingsNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  minRole: MinRole;
  moduleId?: string;
};

export type SettingsSection = {
  section: string;
  description: string;
  items: SettingsNavItem[];
};

export const settingsSections: SettingsSection[] = [
  {
    section: "Data Management",
    description: "Configure how data is structured and displayed.",
    items: [
      {
        href: "/settings/client/data",
        label: "Customize Your Data",
        description: "Define custom dropdown values for incident type and status.",
        icon: Database,
        minRole: "Manager",
      },
      {
        href: "/settings/client/fields",
        label: "Custom Fields",
        description: "Add your own fields to incident records with flexible data types.",
        icon: Sliders,
        minRole: "Manager",
      },
      {
        href: "/settings/client/documents",
        label: "Document Library",
        description: "Upload and manage organizational policies, procedures, and checklists.",
        icon: FileText,
        minRole: "Manager",
      },
      {
        href: "/settings/client/sla",
        label: "SLA Rules",
        description: "Set investigation and closure deadlines for events by type.",
        icon: Clock,
        minRole: "Manager",
      },
    ],
  },
  {
    section: "Team",
    description: "Manage who has access to this client.",
    items: [
      {
        href: "/settings/client/users",
        label: "User Administration",
        description: "Add and remove users, and manage their roles for this client.",
        icon: Users,
        minRole: "Admin",
      },
    ],
  },
  {
    section: "Automation",
    description: "Automate event handling with rules and workflows.",
    items: [
      {
        href: "/settings/client/workflow-rules",
        label: "Workflow Rules",
        description: "Auto-assign, auto-tag, escalate, and create tasks based on event conditions.",
        icon: Zap,
        minRole: "Manager",
      },
      {
        href: "/settings/client/reports",
        label: "Scheduled Reports",
        description: "Send weekly or monthly email digests with event KPIs to your team.",
        icon: Mail,
        minRole: "Admin",
      },
    ],
  },
  {
    section: "Integrations",
    description: "Connect ImperaOps to external systems.",
    items: [
      {
        href: "/settings/client/webhooks",
        label: "Webhooks",
        description: "Send event lifecycle notifications to external URLs.",
        icon: Webhook,
        minRole: "Admin",
      },
      {
        href: "/settings/client/api-keys",
        label: "API Keys",
        description: "Manage machine-to-machine API credentials for external integrations.",
        icon: Key,
        minRole: "Admin",
      },
    ],
  },
];
