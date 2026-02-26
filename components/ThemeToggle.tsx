"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";

const CYCLE: ("system" | "light" | "dark")[] = ["system", "light", "dark"];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" />;
  }

  const idx = CYCLE.indexOf(theme as typeof CYCLE[number]);
  const next = CYCLE[(idx + 1) % CYCLE.length];

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System";

  return (
    <button
      onClick={() => setTheme(next)}
      className="flex items-center justify-center h-9 w-9 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-all"
      title={`Theme: ${label}`}
      aria-label={`Switch theme (current: ${label})`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
