export const colors = {
  background: "#09090b", // zinc-950
  card: {
    base: "#18181b", // zinc-900
    hover: "#27272a", // zinc-800
    border: "#27272a",
  },
  primary: {
    from: "#2563eb", // blue-600
    to: "#9333ea", // purple-600
    hoverFrom: "#3b82f6",
    hoverTo: "#a855f7",
  },
  secondary: {
    base: "#27272a",
    hover: "#3f3f46",
    text: "#e4e4e7",
  },
  status: {
    success: "#22c55e", // green-500
    warning: "#f59e0b", // amber-500
    danger: "#ef4444", // red-500
    info: "#3b82f6", // blue-500
  },
  text: {
    heading: "#ffffff",
    body: "#e4e4e7",
    muted: "#a1a1aa",
    subtle: "#71717a",
  }
} as const;
