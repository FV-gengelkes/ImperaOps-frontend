import { Clock, Database, FileText, Sliders, Users, Webhook } from "lucide-react";

export const settingsSections = [
  {
    section: "Data Management",
    description: "Configure how data is structured and displayed.",
    items: [
      {
        href: "/settings/client/data",
        label: "Customize Your Data",
        description: "Define custom dropdown values for incident type and status.",
        icon: Database,
      },
      {
        href: "/settings/client/fields",
        label: "Custom Fields",
        description: "Add your own fields to incident records with flexible data types.",
        icon: Sliders,
      },
      {
        href: "/settings/client/documents",
        label: "Document Library",
        description: "Upload and manage organizational policies, procedures, and checklists.",
        icon: FileText,
      },
      {
        href: "/settings/client/sla",
        label: "SLA Rules",
        description: "Set investigation and closure deadlines for events by type.",
        icon: Clock,
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
      },
    ],
  },
];
