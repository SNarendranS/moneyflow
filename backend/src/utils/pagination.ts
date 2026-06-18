import { PaginationQuery, PaginatedResult } from '../types';

export const getPaginationOptions = (query: PaginationQuery) => {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));
  const skip = (page - 1) * limit;
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sortBy = query.sortBy || 'createdAt';
  return { page, limit, skip, sortBy, sortOrder };
};

export const buildPaginatedResult = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
