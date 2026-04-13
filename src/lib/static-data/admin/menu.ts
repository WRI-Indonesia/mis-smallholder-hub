// No JSX imports needed

export type RbacRole = "admin" | "operator" | "user" | "all";
export type RbacGroup = "WRI" | "UL" | "ICS" | "public" | "all";
export type RbacJobDesc = "fasilitator" | "agronomis" | "hse" | "manager" | "all";
export type RbacRegion = "Kampar" | "Siak" | "Pelalawan" | "Rokan Hulu" | "all";

export interface RbacPolicy {
  roles?: RbacRole[];
  groups?: RbacGroup[];
  jobDescs?: RbacJobDesc[];
  regions?: RbacRegion[];
}

export interface MenuItem {
  title: string;
  url: string;
  icon?: string;
  isActive?: boolean;
  items?: Omit<MenuItem, "icon" | "items">[];
  rbac?: RbacPolicy;
}

export interface UserContext {
  role: string;
  group: string;
  jobDesc: string;
  region: string;
}

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

export function filterNavItems(items: MenuItem[], user: UserContext): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    // Check root item RBAC
    if (!checkAccess(item.rbac, user)) continue;

    let subItems = item.items;
    if (subItems) {
      subItems = subItems.filter((subItem) => checkAccess(subItem.rbac, user));
      // If parent requires sub-items but all are filtered out, hide parent
      if (subItems.length === 0) continue;
    }

    result.push({ ...item, items: subItems });
  }
  return result;
}

function checkAccess(policy: RbacPolicy | undefined, user: UserContext): boolean {
  if (!policy) return true; // Accessible to all if no policy defined

  const roleMatch = !policy.roles || policy.roles.includes("all") || policy.roles.includes(user.role as RbacRole);
  const groupMatch = !policy.groups || policy.groups.includes("all") || policy.groups.includes(user.group as RbacGroup);
  const jobMatch = !policy.jobDescs || policy.jobDescs.includes("all") || policy.jobDescs.includes(user.jobDesc as RbacJobDesc);
  const regionMatch = !policy.regions || policy.regions.includes("all") || policy.regions.includes(user.region as RbacRegion);

  return roleMatch && groupMatch && jobMatch && regionMatch;
}
