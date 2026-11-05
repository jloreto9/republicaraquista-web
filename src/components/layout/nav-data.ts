import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart3,
  GitCompare,
  PieChart,
  Target,
  Shield,
  Activity,
  Radio,
  Calendar,
  Newspaper,
  UserCheck,
  Tv,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  isPending?: boolean;
}

export interface NavGroup {
  category: string;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    category: "En Vivo & Cobertura",
    items: [
      { name: "Centro de Mando", href: "/", icon: LayoutDashboard },
      { name: "Game Center (En Vivo)", href: "/game-center", icon: Tv, badge: "LIVE" },
      { name: "NotiCueva", href: "/noticueva", icon: Newspaper, badge: "NUEVO" },
    ],
  },
  {
    category: "Temporada & Equipo",
    items: [
      { name: "Posiciones & ELO", href: "/standings", icon: Trophy },
      { name: "Calendario Oficial", href: "/calendario", icon: Calendar },
      { name: "Roster Oficial & Staff", href: "/roster", icon: UserCheck, badge: "34" },
      { name: "Bullpen & Lineups", href: "/bullpen", icon: Shield },
    ],
  },
  {
    category: "Laboratorio Sabermétrico",
    items: [
      { name: "Líderes Individuales", href: "/individuales", icon: Users },
      { name: "Pitching Summary", href: "/pitching", icon: Radio },
      { name: "Matchup 360 (H2H)", href: "/matchup", icon: GitCompare },
      { name: "Estadísticas Colectivas", href: "/colectivas", icon: BarChart3 },
      { name: "Win Expectancy & WPA", href: "/wpa", icon: Activity },
      { name: "Splits Situacionales", href: "/situacional", icon: PieChart },
      { name: "Spray Charts", href: "/spray-charts", icon: Target },
    ],
  },
];
