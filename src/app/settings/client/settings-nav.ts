import { Database, Sliders, Users } from "lucide-react";

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
];
