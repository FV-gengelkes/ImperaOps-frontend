export interface MonthlyDataPoint {
  month: string;
  accident: number;
  injury: number;
  nearMiss: number;
  propertyDamage: number;
  safetyViolation: number;
}

export const monthlyData: MonthlyDataPoint[] = [
  { month: "Mar '24", accident: 7,  injury: 2, nearMiss: 11, propertyDamage: 5, safetyViolation: 3 },
  { month: "Apr",     accident: 9,  injury: 4, nearMiss: 14, propertyDamage: 7, safetyViolation: 2 },
  { month: "May",     accident: 6,  injury: 3, nearMiss: 9,  propertyDamage: 4, safetyViolation: 5 },
  { month: "Jun",     accident: 11, injury: 5, nearMiss: 16, propertyDamage: 8, safetyViolation: 4 },
  { month: "Jul",     accident: 14, injury: 6, nearMiss: 18, propertyDamage: 9, safetyViolation: 6 },
  { month: "Aug",     accident: 10, injury: 4, nearMiss: 13, propertyDamage: 6, safetyViolation: 3 },
  { month: "Sep",     accident: 8,  injury: 3, nearMiss: 11, propertyDamage: 5, safetyViolation: 4 },
  { month: "Oct",     accident: 12, injury: 5, nearMiss: 15, propertyDamage: 7, safetyViolation: 5 },
  { month: "Nov",     accident: 9,  injury: 4, nearMiss: 12, propertyDamage: 6, safetyViolation: 3 },
  { month: "Dec",     accident: 7,  injury: 3, nearMiss: 10, propertyDamage: 5, safetyViolation: 2 },
  { month: "Jan '25", accident: 13, injury: 6, nearMiss: 17, propertyDamage: 8, safetyViolation: 5 },
  { month: "Feb",     accident: 8,  injury: 3, nearMiss: 12, propertyDamage: 6, safetyViolation: 4 },
];

export const typeData = [
  { name: "Near Miss",        value: 158, color: "#f59e0b" },
  { name: "Accident",         value: 114, color: "#ef4444" },
  { name: "Property Damage",  value: 76,  color: "#8b5cf6" },
  { name: "Injury",           value: 48,  color: "#f97316" },
  { name: "Safety Violation", value: 46,  color: "#6366f1" },
];

export const statusData = [
  { name: "Open",        value: 89,  color: "#3b82f6" },
  { name: "In Progress", value: 47,  color: "#f59e0b" },
  { name: "Blocked",     value: 23,  color: "#ef4444" },
  { name: "Closed",      value: 283, color: "#10b981" },
];

export const locationData = [
  { location: "I-90 Mile Marker 142",    count: 34 },
  { location: "Dallas Distribution Hub", count: 29 },
  { location: "I-40 Near Albuquerque",   count: 24 },
  { location: "Chicago Depot 3",         count: 21 },
  { location: "Atlanta Terminal B",      count: 19 },
  { location: "Denver Sorting Facility", count: 17 },
  { location: "I-80 East Sacramento",    count: 15 },
  { location: "Memphis Cross-Dock",      count: 13 },
  { location: "Phoenix Yard 2",          count: 11 },
  { location: "Seattle Container Port",  count: 9  },
];

export const kpi = {
  total: 442,
  totalChange: 11.1,
  open: 89,
  openChange: -5.3,
  avgCloseDays: 4.2,
  avgCloseDaysChange: -16.0,
  thisMonth: 33,
  thisMonthChange: 17.9,
};
