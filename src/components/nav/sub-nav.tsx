import { NavLink } from "./nav-link";
import type { NavItem } from "@/lib/nav";

export function SubNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-surface-border px-4 sm:mx-0 sm:px-0">
      {items.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={null}
          exact
          className="whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
          activeClassName="border-accent text-foreground"
          inactiveClassName="border-transparent text-muted hover:text-foreground"
        />
      ))}
    </nav>
  );
}
