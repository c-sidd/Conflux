export const colors = {
  // Layered Background System
  appBackground: "#F8FAFC",  // slate-50
  sidebar: "#FFFFFF",        // pure white
  mainContent: "#FCFCFD",   // off-white layered background
  card: "#FFFFFF",           // pure white card & modal background
  
  // States & Selection
  hover: "#F1F5F9",          // slate-100
  selectedRow: "#EFF6FF",    // soft blue selection
  
  // Borders & Dividers
  border: "#E2E8F0",         // slate-200
  divider: "#CBD5E1",        // slate-300
  
  // Typography Hierarchy
  text: {
    primary: "#0F172A",      // slate-900
    secondary: "#475569",    // slate-600
    muted: "#94A3B8",        // slate-400
    subtle: "#CBD5E1",       // slate-300
    inverse: "#FFFFFF",
  },
  
  // Brand & Accent Colors
  primary: {
    base: "#2563EB",         // blue-600
    hover: "#1D4ED8",        // blue-700
    light: "#DBEAFE",        // blue-100
    text: "#FFFFFF",
  },
  
  // Status Colors
  status: {
    success: "#16A34A",      // green-600
    warning: "#F59E0B",      // amber-500
    danger: "#DC2626",       // red-600
    info: "#06B6D4",         // cyan-500
  }
} as const;
