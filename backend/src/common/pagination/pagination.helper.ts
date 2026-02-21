import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedResult } from './interfaces/paginated-result.interface';

/**
 * Generic paginate helper.
 *
 * @param queryBuilder - A TypeORM SelectQueryBuilder (already joined / where'd by the caller)
 * @param dto          - PaginationDto containing page, limit, sort, and optional filters
 * @param alias        - The root entity alias used in the query builder (default: first alias)
 *
 * @example
 *   const qb = this.eventsRepo.createQueryBuilder('event');
 *   return paginate(qb, paginationDto, 'event');
 */
export async function paginate<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  dto: PaginationDto,
  alias?: string,
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    order = 'DESC',
    // Date range
    dateFrom,
    dateTo,
    dateField = 'createdAt',
    // Price range
    priceMin,
    priceMax,
    priceField = 'price',
    // Status
    status,
    statusField = 'status',
  } = dto;

  // Resolve alias — fall back to the first alias on the query builder
  const rootAlias = alias ?? queryBuilder.alias;

  // ─── Apply Optional Filters ────────────────────────────────────────────────

  if (dateFrom) {
    queryBuilder.andWhere(`${rootAlias}.${dateField} >= :dateFrom`, {
      dateFrom: new Date(dateFrom),
    });
  }

  if (dateTo) {
    queryBuilder.andWhere(`${rootAlias}.${dateField} <= :dateTo`, {
      dateTo: new Date(dateTo),
    });
  }

  if (priceMin !== undefined) {
    queryBuilder.andWhere(`${rootAlias}.${priceField} >= :priceMin`, {
      priceMin,
    });
  }

  if (priceMax !== undefined) {
    queryBuilder.andWhere(`${rootAlias}.${priceField} <= :priceMax`, {
      priceMax,
    });
  }

  if (status !== undefined) {
    queryBuilder.andWhere(`${rootAlias}.${statusField} = :status`, { status });
  }

  // ─── Sorting ───────────────────────────────────────────────────────────────

  const safeOrder = order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  queryBuilder.orderBy(`${rootAlias}.${sortBy}`, safeOrder);

  // ─── Count total BEFORE pagination ────────────────────────────────────────

  const total = await queryBuilder.getCount();

  // ─── Pagination ────────────────────────────────────────────────────────────

  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const skip = (safePage - 1) * safeLimit;

  queryBuilder.skip(skip).take(safeLimit);

  const data = await queryBuilder.getMany();

  const lastPage = Math.ceil(total / safeLimit) || 1;

  return {
    data,
    total,
    page: safePage,
    lastPage,
    hasNextPage: safePage < lastPage,
    hasPreviousPage: safePage > 1,
  };
}
