import {
  Home,
  Trophy,
  Users,
  Repeat,
  Clapperboard,
  Landmark,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * The six primary sections. Keep this list in sync with the route groups
 * under src/app/(app)/ — it drives the desktop sidebar and mobile nav.
 */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "League", href: "/league", icon: Trophy },
  { label: "Players", href: "/players", icon: Users },
  { label: "Trades", href: "/trades", icon: Repeat },
  { label: "Media", href: "/media", icon: Clapperboard },
  { label: "History", href: "/history", icon: Landmark },
];

export const LEAGUE_SUBNAV: NavItem[] = [
  { label: "Overview", href: "/league", icon: Trophy },
  { label: "Matchups", href: "/league/matchups", icon: Trophy },
  { label: "Standings", href: "/league/standings", icon: Trophy },
  { label: "Power Rankings", href: "/league/power-rankings", icon: Trophy },
  { label: "League Records", href: "/league/records", icon: Trophy },
  { label: "Recap", href: "/league/recap", icon: Trophy },
];

export const PLAYERS_SUBNAV: NavItem[] = [
  { label: "Trending", href: "/players", icon: Users },
  { label: "Search", href: "/players/search", icon: Users },
  { label: "Watchlist", href: "/players/watchlist", icon: Users },
];

export const TRADES_SUBNAV: NavItem[] = [
  { label: "Trade Block", href: "/trades", icon: Repeat },
  { label: "Trade History", href: "/trades/history", icon: Repeat },
];

/**
 * Not one of the six primary sections (like Profile) — a lightweight
 * utility entry point rendered alongside the primary nav, not inside it.
 */
export const UTILITY_NAV: NavItem[] = [{ label: "Chat", href: "/chat", icon: MessageCircle }];

export const HISTORY_SUBNAV: NavItem[] = [
  { label: "Champions", href: "/history/champions", icon: Landmark },
  { label: "Seasons", href: "/history/seasons", icon: Landmark },
  { label: "Records", href: "/history/records", icon: Landmark },
  { label: "Rivalries", href: "/history/rivalries", icon: Landmark },
];
