import { SubNav } from "@/components/nav/sub-nav";
import { LEAGUE_SUBNAV } from "@/lib/nav";

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={LEAGUE_SUBNAV} />
      {children}
    </div>
  );
}
