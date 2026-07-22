/**
 * Helper pohon menu untuk render rekursif (3 level) di Menu Management &
 * Role & Permission. Menggantikan pola datar `parents` + `getChildren` yang
 * hanya menampilkan 2 level (bug: menu level-3 tak pernah muncul).
 */

export interface FlatMenu {
  key: string;
  parentKey: string | null;
}

export interface MenuTreeNode<T extends FlatMenu> {
  item: T;
  depth: number;
  children: MenuTreeNode<T>[];
}

/** Bangun pohon dari daftar datar; urutan input dipertahankan per induk. */
export function buildMenuTree<T extends FlatMenu>(items: T[]): MenuTreeNode<T>[] {
  const childrenByParent = new Map<string | null, T[]>();
  for (const item of items) {
    const parent = item.parentKey ?? null;
    const bucket = childrenByParent.get(parent);
    if (bucket) bucket.push(item);
    else childrenByParent.set(parent, [item]);
  }

  const build = (parentKey: string | null, depth: number): MenuTreeNode<T>[] =>
    (childrenByParent.get(parentKey) ?? []).map((item) => ({
      item,
      depth,
      children: build(item.key, depth + 1),
    }));

  return build(null, 0);
}

/** Kunci semua node yang punya anak (level-1 & level-2) — untuk "Buka/Tutup semua". */
export function collapsibleKeys<T extends FlatMenu>(nodes: MenuTreeNode<T>[]): string[] {
  const keys: string[] = [];
  const walk = (ns: MenuTreeNode<T>[]) => {
    for (const n of ns) {
      if (n.children.length > 0) {
        keys.push(n.item.key);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return keys;
}

/** Semua kunci keturunan sebuah node (tidak termasuk dirinya). */
export function descendantKeys<T extends FlatMenu>(nodes: MenuTreeNode<T>[], key: string): string[] {
  const find = (ns: MenuTreeNode<T>[]): MenuTreeNode<T> | null => {
    for (const n of ns) {
      if (n.item.key === key) return n;
      const found = find(n.children);
      if (found) return found;
    }
    return null;
  };
  const node = find(nodes);
  if (!node) return [];
  const out: string[] = [];
  const walk = (ns: MenuTreeNode<T>[]) => {
    for (const n of ns) {
      out.push(n.item.key);
      walk(n.children);
    }
  };
  walk(node.children);
  return out;
}

export interface VisibleRow<T extends FlatMenu> {
  item: T;
  depth: number;
  hasChildren: boolean;
}

/**
 * Ratakan pohon jadi baris terurut untuk render.
 * - Node disembunyikan bila salah satu leluhurnya `collapsed`.
 * - Bila `matches` diberikan (mode pencarian): hanya node yang cocok atau
 *   punya keturunan cocok yang tampil, leluhur ikut tampil, dan subtree cocok
 *   selalu di-*expand* (abaikan collapse).
 */
export function flattenTree<T extends FlatMenu>(
  nodes: MenuTreeNode<T>[],
  opts: {
    isCollapsed: (key: string) => boolean;
    matches?: (item: T) => boolean;
  }
): VisibleRow<T>[] {
  const rows: VisibleRow<T>[] = [];

  // Mode pencarian: sertakan node bila cocok atau punya keturunan cocok;
  // leluhur ikut tampil, subtree yang lolos selalu di-expand.
  if (opts.matches) {
    const matches = opts.matches;
    const visit = (node: MenuTreeNode<T>): VisibleRow<T>[] | null => {
      const childRows: VisibleRow<T>[] = [];
      for (const child of node.children) {
        const sub = visit(child);
        if (sub) childRows.push(...sub);
      }
      if (matches(node.item) || childRows.length > 0) {
        return [
          { item: node.item, depth: node.depth, hasChildren: node.children.length > 0 },
          ...childRows,
        ];
      }
      return null;
    };
    for (const node of nodes) {
      const sub = visit(node);
      if (sub) rows.push(...sub);
    }
    return rows;
  }

  // Mode normal: sembunyikan subtree yang induknya collapsed.
  const walk = (ns: MenuTreeNode<T>[]) => {
    for (const node of ns) {
      const hasChildren = node.children.length > 0;
      rows.push({ item: node.item, depth: node.depth, hasChildren });
      if (hasChildren && !opts.isCollapsed(node.item.key)) walk(node.children);
    }
  };
  walk(nodes);
  return rows;
}
