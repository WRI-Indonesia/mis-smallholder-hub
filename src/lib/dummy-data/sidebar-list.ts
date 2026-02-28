import {
  LayoutDashboard,
  FileText,
  Database,
  Wrench,
  PanelTop,
  Settings,
  Settings2,
  Trash2,
  Map,
  LineChart,
  GraduationCap,
  Sprout,
  MapPin,
  Users,
  User,
  Mountain,
  Home,
  UsersRound,
  Calendar,
  Image as ImageIcon,
  UserCog,
  MenuSquare,
  BookKey,
} from "lucide-react"

export const SIDEBAR_DATA = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
    items: [
      { title: "KPI & Impact Indicators", url: "/dashboard/kpi", icon: LineChart },
      { title: "Training", url: "/dashboard/training", icon: GraduationCap },
      { title: "BMP", url: "/dashboard/bmp", icon: Sprout },
    ],
  },
  {
    title: "Report",
    url: "/dashboard/report",
    icon: FileText,
    items: [
      { title: "Training", url: "/dashboard/report/training", icon: GraduationCap },
      { title: "BMP", url: "/dashboard/report/bmp", icon: Sprout },
    ],
  },
  {
    title: "MAP",
    url: "/dashboard/map",
    icon: Map,
    items: [
      { title: "Basic", url: "/dashboard/map/basic", icon: MapPin },
    ],
  },
  {
    title: "Master Data",
    url: "/dashboard/master-data",
    icon: Database,
    items: [
      { title: "Farmer Groups", url: "/dashboard/master-data/farmer-groups", icon: Users },
      { title: "Farmer", url: "/dashboard/master-data/farmer", icon: User },
      { title: "Land Parcel", url: "/dashboard/master-data/land-parcel", icon: Mountain },
    ],
  },
  {
    title: "Tools",
    url: "/dashboard/tools",
    icon: Wrench,
    items: [],
  },
  {
    title: "CMS",
    url: "/dashboard/cms",
    icon: PanelTop,
    items: [
      { title: "Home", url: "/dashboard/cms/home", icon: Home },
      { title: "Community", url: "/dashboard/cms/community", icon: UsersRound },
      { title: "Activity", url: "/dashboard/cms/activity", icon: Calendar },
      { title: "Media", url: "/dashboard/cms/media", icon: ImageIcon },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      {
        title: "User Management",
        url: "/dashboard/settings/user",
      },
      {
         title: "Menu Structure",
         url: "/dashboard/settings/menu",
      },
      {
        title: "Regional Hierarchy",
        url: "/dashboard/settings/regional",
      },
      {
        title: "Training Types",
        url: "/dashboard/settings/training-type",
      },
    ],
  },
]