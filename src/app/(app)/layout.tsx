import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/nav/sidebar";
import { MobileNav } from "@/components/nav/mobile-nav";
import { MobileHeader } from "@/components/nav/mobile-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: middleware already redirects unauthenticated requests
  // away from this route group, but never trust that alone for page auth.
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar email={user.email ?? null} />
      <div className="flex flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 px-4 pb-20 pt-6 sm:px-6 md:pb-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
