export interface MenuItem {
  id?: string;
  key: string;
  parentKey: string | null;
  title: string;
  url: string;
  icon: string | null;
  order?: number;
  isActive?: boolean;
  isVisible?: boolean;
  children?: MenuItem[];
}

/**
 * Helper function to build a hierarchical menu tree recursively.
 */
export function buildMenuTree(
  items: MenuItem[],
  parentKey: string | null = null,
  currentDepth: number = 1,
  maxDepth: number = 3
): MenuItem[] {
  if (currentDepth > maxDepth) return [];

  return items
    .filter((item) => item.parentKey === parentKey)
    .map((item) => {
      const children = buildMenuTree(items, item.key, currentDepth + 1, maxDepth);
      return {
        ...item,
        children,
      };
    });
}

/**
 * Validates if adding/updating a menu item under a parentKey does not exceed maxDepth (3).
 * If the menu tree would have a depth > 3, it should return false.
 * Items is the list of all existing menu items.
 */
export function validateMenuDepth(
  key: string,
  parentKey: string | null,
  items: MenuItem[]
): boolean {
  if (!parentKey) {
    // If it has no parent, depth is at most 1 + depth of its children
    return getSubtreeDepth(key, items) <= 3;
  }

  // Find parent chain length
  let depth = 1;
  let currentParent = items.find((item) => item.key === parentKey);
  
  while (currentParent) {
    depth++;
    if (depth > 3) return false;
    
    // Move up the chain
    if (currentParent.parentKey === currentParent.key) {
      // Prevent infinite loop in case of self-reference (though database validation should prevent it)
      break;
    }
    
    currentParent = currentParent.parentKey
      ? items.find((item) => item.key === currentParent!.parentKey)
      : undefined;
  }

  // Now add the maximum depth of the subtree starting at this item (if it already has children)
  const subtreeDepth = getSubtreeDepth(key, items);
  // Total depth is parent chain depth + subtree depth - 1 (since key is counted in both)
  return (depth + subtreeDepth - 1) <= 3;
}

/**
 * Helper to calculate the maximum depth of a subtree starting at a given key.
 */
function getSubtreeDepth(key: string, items: MenuItem[]): number {
  const children = items.filter((item) => item.parentKey === key);
  if (children.length === 0) return 1;

  let maxChildDepth = 0;
  for (const child of children) {
    const childDepth = getSubtreeDepth(child.key, items);
    if (childDepth > maxChildDepth) {
      maxChildDepth = childDepth;
    }
  }

  return 1 + maxChildDepth;
}
