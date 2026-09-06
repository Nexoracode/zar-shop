/**
 * The page numbers a pager should render for `page` of `totalPages`: the first and last page
 * always, a run around the current one, and `"ellipsis"` markers for the gaps. Keeps the control
 * a fixed width no matter how many pages there are.
 */
export function paginationWindow(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) return Array.from({ length: Math.max(totalPages, 1) }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (page >= totalPages - 2) return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];
}
