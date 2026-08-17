"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

export function NavLink({
  item,
  exact = false,
  className,
  activeClassName,
  inactiveClassName,
}: {
  item: NavItem;
  exact?: boolean;
  className?: string;
  activeClassName: string;
  inactiveClassName: string;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}
