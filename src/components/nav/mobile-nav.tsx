import { PRIMARY_NAV } from "@/lib/nav";
import { NavLink } from "./nav-link";

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-surface-border bg-surface/95 backdrop-blur md:hidden">
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={<item.icon className="size-5 shrink-0" aria-hidden="true" />}
          exact={item.href === "/"}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium"
          activeClassName="text-accent"
          inactiveClassName="text-muted"
        />
      ))}
    </nav>
  );
}
