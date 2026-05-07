// menu.ts — Static CSV-based menu loader (deprecated: sidebar now uses DB via getMenuItems())
// Types and RBAC logic are in menu-utils.ts to allow test imports without CSV parse errors.

import type { MenuItem, RbacRole, RbacGroup, RbacJobDesc, RbacRegion } from "./menu-utils";

export type {
  RbacRole,
  RbacGroup,
  RbacJobDesc,
  RbacRegion,
  RbacPolicy,
  MenuItem,
  UserContext,
} from "./menu-utils";
export { filterNavItems } from "./menu-utils";

import Papa from "papaparse";
import csvRaw from "./menu.csv";

// Icon mapping is handled in the UI Layer (NavMain.tsx)

type FlatMenuItem = {
  id: string;
  parentId: string;
  title: string;
  url: string;
  icon: string;
  isActive: string;
  roles: string;
  groups: string;
  jobDescs: string;
  regions: string;
};

const parsedData = Papa.parse<FlatMenuItem>(csvRaw, { header: true, skipEmptyLines: true }).data;

export const adminMenu: MenuItem[] = [];
const itemMap: Record<string, MenuItem> = {};

// Step 1: Create all menu item objects
parsedData.forEach(row => {
  if (!row.id) return;
  
  const menuItem: MenuItem = {
    title: row.title,
    url: row.url,
    icon: row.icon || undefined,
    isActive: row.isActive === "true",
    rbac: {
      roles: row.roles ? row.roles.split("|") as RbacRole[] : ["all"],
      groups: row.groups ? row.groups.split("|") as RbacGroup[] : ["all"],
      jobDescs: row.jobDescs ? row.jobDescs.split("|") as RbacJobDesc[] : ["all"],
      regions: row.regions ? row.regions.split("|") as RbacRegion[] : ["all"],
    }
  };
  
  itemMap[row.id] = menuItem;
});

// Step 2: Build parent-child relationships
parsedData.forEach(row => {
  if (!row.id) return;
  
  const menuItem = itemMap[row.id];
  if (row.parentId) {
    const parent = itemMap[row.parentId];
    if (parent) {
      if (!parent.items) parent.items = [];
      parent.items.push(menuItem);
    }
  } else {
    adminMenu.push(menuItem);
  }
});
