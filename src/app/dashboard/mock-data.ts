export interface MonthlyDataPoint {
  month: string;
  total: number;
}

export const monthlyData: MonthlyDataPoint[] = [
  { month: "Mar '24", total: 28 },
  { month: "Apr",     total: 36 },
  { month: "May",     total: 27 },
  { month: "Jun",     total: 44 },
  { month: "Jul",     total: 53 },
  { month: "Aug",     total: 36 },
  { month: "Sep",     total: 31 },
  { month: "Oct",     total: 44 },
  { month: "Nov",     total: 34 },
  { month: "Dec",     total: 27 },
  { month: "Jan '25", total: 49 },
  { month: "Feb",     total: 33 },
];

export const typeData = [
  { name: "Near Miss",        value: 158, color: "#f59e0b" },
  { name: "Accident",         value: 114, color: "#ef4444" },
  { name: "Property Damage",  value: 76,  color: "#8b5cf6" },
  { name: "Injury",           value: 48,  color: "#f97316" },
  { name: "Safety Violation", value: 46,  color: "#6366f1" },
];

export const statusData = [
  { name: "Open",   value: 89,  color: "#2F80ED" },
  { name: "Closed", value: 353, color: "#16A34A" },
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
];

export const kpi = {
  total: 442,
  totalChange: 11.1,
  open: 89,
  openChange: -5.3,
  thisMonth: 33,
  thisMonthChange: 17.9,
};
