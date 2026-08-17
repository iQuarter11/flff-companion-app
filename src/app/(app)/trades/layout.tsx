import { SubNav } from "@/components/nav/sub-nav";
import { TRADES_SUBNAV } from "@/lib/nav";

export default function TradesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={TRADES_SUBNAV} />
      {children}
    </div>
  );
}
