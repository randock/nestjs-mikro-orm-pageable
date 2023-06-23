import { Pageable } from './pageable.type';
import { PageableOptions } from './pageable-options.type';

export type PageableQuery = Partial<Omit<Pageable, 'offset' | 'totalPages' | 'totalItems'> & PageableOptions>;
