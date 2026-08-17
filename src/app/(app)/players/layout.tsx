import { SubNav } from "@/components/nav/sub-nav";
import { PLAYERS_SUBNAV } from "@/lib/nav";

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={PLAYERS_SUBNAV} />
      {children}
    </div>
  );
}
