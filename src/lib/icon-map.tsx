/**
 * icon-map.tsx
 * Single source of truth for all available sidebar menu icons.
 *
 * To add a new icon:
 * 1. Import it from lucide-react below
 * 2. Add an entry to ICON_MAP with the same key as the icon name
 *
 * The key (string) is what gets stored in the DB (MenuItem.icon field).
 */

import {
  // Navigation & Layout
  LayoutDashboard,
  Database,
  Monitor,
  Wrench,
  Camera,
  Settings,
  Menu,
  Home,
  // Data & Analytics
  BarChart3,
  BarChart2,
  LineChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  Activity,
  // Agriculture & Nature
  Leaf,
  Sprout,
  Flower2,
  TreePine,
  Sun,
  Droplets,
  // Education & Training
  GraduationCap,
  BookOpen,
  BookMarked,
  Library,
  // People & Organization
  Users,
  User,
  UserCog,
  Users2,
  UserCheck,
  Briefcase,
  Building2,
  // Maps & Location
  Map,
  MapPin,
  Globe,
  Compass,
  Navigation,
  // Files & Documents
  FileText,
  File,
  FolderOpen,
  ClipboardList,
  // Tools & Actions
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  // Security & Settings
  Shield,
  Lock,
  Key,
  SlidersHorizontal,
  // Misc
  Star,
  Flag,
  Tag,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Icon Map ─────────────────────────────────────────────────────────────────
// Used by nav-main.tsx to render icons from string keys stored in DB

export const ICON_MAP: Record<string, LucideIcon> = {
  // Navigation & Layout
  LayoutDashboard: LayoutDashboard,
  LayoutDashboardIcon: LayoutDashboard,
  Database: Database,
  DatabaseIcon: Database,
  Monitor: Monitor,
  MonitorIcon: Monitor,
  Wrench: Wrench,
  WrenchIcon: Wrench,
  Camera: Camera,
  CameraIcon: Camera,
  Settings: Settings,
  SettingsIcon: Settings,
  Menu: Menu,
  Home: Home,
  // Data & Analytics
  BarChart3: BarChart3,
  BarChart2: BarChart2,
  LineChart: LineChart,
  PieChart: PieChart,
  TrendingUp: TrendingUp,
  TrendingDown: TrendingDown,
  Activity: Activity,
  // Agriculture & Nature
  Leaf: Leaf,
  Sprout: Sprout,
  Flower2: Flower2,
  TreePine: TreePine,
  Sun: Sun,
  Droplets: Droplets,
  // Education & Training
  GraduationCap: GraduationCap,
  BookOpen: BookOpen,
  BookMarked: BookMarked,
  Library: Library,
  // People & Organization
  Users: Users,
  User: User,
  UserCog: UserCog,
  Users2: Users2,
  UserCheck: UserCheck,
  Briefcase: Briefcase,
  Building2: Building2,
  // Maps & Location
  Map: Map,
  MapPin: MapPin,
  Globe: Globe,
  Compass: Compass,
  Navigation: Navigation,
  // Files & Documents
  FileText: FileText,
  File: File,
  FolderOpen: FolderOpen,
  ClipboardList: ClipboardList,
  // Tools & Actions
  Upload: Upload,
  Download: Download,
  RefreshCw: RefreshCw,
  Search: Search,
  Filter: Filter,
  // Security & Settings
  Shield: Shield,
  Lock: Lock,
  Key: Key,
  SlidersHorizontal: SlidersHorizontal,
  // Misc
  Star: Star,
  Flag: Flag,
  Tag: Tag,
  Bell: Bell,
  CheckCircle: CheckCircle,
  AlertTriangle: AlertTriangle,
  Info: Info,
  HelpCircle: HelpCircle,
};

// ─── Icon List ────────────────────────────────────────────────────────────────
// Used by the icon picker in the form modal (with search)

export const ICON_LIST = Object.keys(ICON_MAP);

// ─── Render helper ────────────────────────────────────────────────────────────

export function renderIcon(
  name: string | null | undefined,
  className?: string
): React.ReactNode {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className={className} />;
}
