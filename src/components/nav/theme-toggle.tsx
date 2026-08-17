"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/**
 * Reads/writes the same 'theme' localStorage key the inline script in
 * src/app/layout.tsx checks before hydration (so there's no flash of the
 * wrong theme on load) and toggles the .dark class it applies.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Reads DOM state set by the pre-hydration inline script in
    // src/app/layout.tsx (avoids a flash of the wrong theme) — this can
    // only be known client-side after mount, so this isn't state that
    // could instead be derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  if (theme === null) {
    return <div className="size-9" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        document.documentElement.classList.toggle("dark", next === "dark");
        localStorage.setItem("theme", next);
        setTheme(next);
      }}
      className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
