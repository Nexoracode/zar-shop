export const adminPageSizes = [10, 20, 50, 100] as const;
export const defaultAdminPageSize = 10;
export const adminPageSizeCookieName = "admin-page-size";
export const adminPageSizeCookieMaxAge = 60 * 60 * 24 * 365;

export function parseAdminPagination(params: { page?: string; pageSize?: string }, preferredPageSize?: string) {
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const parsedPageSize = Number.parseInt(preferredPageSize ?? params.pageSize ?? String(defaultAdminPageSize), 10);
  const pageSize = adminPageSizes.includes(parsedPageSize as (typeof adminPageSizes)[number])
    ? parsedPageSize
    : defaultAdminPageSize;

  return {
    requestedPage: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize,
  };
}

export function resolveAdminPagination(totalItems: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    skip: (page - 1) * pageSize,
  };
}
