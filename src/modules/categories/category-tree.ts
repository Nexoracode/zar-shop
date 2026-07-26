export type FlatCategory<T = unknown> = {
  id: string;
  parentId: string | null;
} & T;

export type CategoryTreeNode<T = unknown> = FlatCategory<T> & {
  children: CategoryTreeNode<T>[];
};

export function buildCategoryTree<T>(categories: FlatCategory<T>[]) {
  const nodes = new Map<string, CategoryTreeNode<T>>();
  const roots: CategoryTreeNode<T>[] = [];

  for (const category of categories) {
    nodes.set(category.id, { ...category, children: [] });
  }

  for (const category of categories) {
    const node = nodes.get(category.id)!;
    const parent = category.parentId ? nodes.get(category.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

export function wouldCreateCategoryCycle(
  categoryId: string,
  parentId: string | null,
  categories: Array<{ id: string; parentId: string | null }>,
) {
  if (!parentId) return false;
  const parents = new Map(categories.map((category) => [category.id, category.parentId]));
  const visited = new Set<string>();
  let cursor: string | null = parentId;

  while (cursor) {
    if (cursor === categoryId || visited.has(cursor)) return true;
    visited.add(cursor);
    cursor = parents.get(cursor) ?? null;
  }

  return false;
}

export function collectCategoryAndDescendantIds(
  categoryId: string,
  categories: Array<{ id: string; parentId: string | null }>,
) {
  const result = new Set([categoryId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && result.has(category.parentId) && !result.has(category.id)) {
        result.add(category.id);
        changed = true;
      }
    }
  }

  return [...result];
}
