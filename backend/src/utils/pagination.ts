export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const toSkip = (page: number, limit: number) => (page - 1) * limit;

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
