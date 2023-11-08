import { PaginateQuery } from './pageable.type';
import { PageableOptions } from './pageable-options.type';

export type PageableQuery = Partial<Omit<PaginateQuery, 'offset' | 'totalPages' | 'totalItems'> & PageableOptions>;
