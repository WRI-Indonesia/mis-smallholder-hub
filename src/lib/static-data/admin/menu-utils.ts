// menu-utils.ts — Pure RBAC types and filtering logic (no CSV import)
// Separated so it can be imported in tests without triggering CSV parse errors.

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

export function filterNavItems(items: MenuItem[], user: UserContext): MenuItem[] {
  const result: MenuItem[] = [];
  for (const item of items) {
    if (!checkAccess(item.rbac, user)) continue;

    let subItems = item.items;
    if (subItems) {
      subItems = subItems.filter((subItem) => checkAccess(subItem.rbac, user));
      if (subItems.length === 0) continue;
    }

    result.push({ ...item, items: subItems });
  }
  return result;
}

function checkAccess(policy: RbacPolicy | undefined, user: UserContext): boolean {
  if (!policy) return true;

  const roleMatch =
    !policy.roles || policy.roles.includes("all") || policy.roles.includes(user.role as RbacRole);
  const groupMatch =
    !policy.groups || policy.groups.includes("all") || policy.groups.includes(user.group as RbacGroup);
  const jobMatch =
    !policy.jobDescs ||
    policy.jobDescs.includes("all") ||
    policy.jobDescs.includes(user.jobDesc as RbacJobDesc);
  const regionMatch =
    !policy.regions ||
    policy.regions.includes("all") ||
    policy.regions.includes(user.region as RbacRegion);

  return roleMatch && groupMatch && jobMatch && regionMatch;
}
