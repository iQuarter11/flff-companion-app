import Link from "next/link";
import { PRIMARY_NAV, UTILITY_NAV } from "@/lib/nav";
import { NavLink } from "./nav-link";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "./theme-toggle";

export function Sidebar({ email }: { email: string | null }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-surface md:flex">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          FFFL
        </Link>
        <ThemeToggle />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-5 shrink-0" aria-hidden="true" />}
            exact={item.href === "/"}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            activeClassName="bg-accent/10 text-accent"
            inactiveClassName="text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-surface-border px-3 pt-3">
        {UTILITY_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-5 shrink-0" aria-hidden="true" />}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            activeClassName="bg-accent/10 text-accent"
            inactiveClassName="text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
          />
        ))}
      </div>

      <div className="border-t border-surface-border p-3">
        <UserMenu email={email} />
      </div>
    </aside>
  );
}
