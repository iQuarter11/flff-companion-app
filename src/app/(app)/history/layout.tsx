import { SubNav } from "@/components/nav/sub-nav";
import { HISTORY_SUBNAV } from "@/lib/nav";

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubNav items={HISTORY_SUBNAV} />
      {children}
    </div>
  );
}
