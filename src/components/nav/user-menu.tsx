import Link from "next/link";
import { UserRound } from "lucide-react";

export function UserMenu({ email }: { email: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href="/profile"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
      >
        <UserRound className="size-5 shrink-0" aria-hidden="true" />
        <span className="truncate">{email ?? "Profile"}</span>
      </Link>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-md px-2 py-1.5 text-xs font-medium text-muted hover:bg-black/[.03] hover:text-foreground dark:hover:bg-white/[.04]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
