"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Icon is passed in as an already-rendered element (e.g. <Home /> from a
 * Server Component caller), not a component reference — a raw component
 * function can't cross the Server -> Client boundary as a prop ("Functions
 * cannot be passed directly to Client Components"). This only breaks once
 * a real authenticated request renders the sidebar/nav, which is why it
 * wasn't caught by earlier build/typecheck passes or by testing only the
 * unauthenticated redirect.
 */
export function NavLink({
  href,
  label,
  icon,
  exact = false,
  className,
  activeClassName,
  inactiveClassName,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  className?: string;
  activeClassName: string;
  inactiveClassName: string;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(className, isActive ? activeClassName : inactiveClassName)}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
