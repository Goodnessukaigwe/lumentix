export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  lastPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
