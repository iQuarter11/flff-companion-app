import Link from "next/link";
import { MessageCircle, UserRound } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

/**
 * Mobile-only top bar. The sidebar (which holds Chat/Profile/sign out on
 * desktop) is hidden below md, and the bottom tab bar only has room for
 * the six primary sections — without this, mobile users had no way to
 * reach /profile or /chat at all.
 */
export function MobileHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-surface-border px-4 md:hidden">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        FFFL
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link
          href="/chat"
          aria-label="Chat"
          className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
        >
          <MessageCircle className="size-5" />
        </Link>
        <Link
          href="/profile"
          aria-label="Profile"
          className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
        >
          <UserRound className="size-5" />
        </Link>
      </div>
    </header>
  );
}
