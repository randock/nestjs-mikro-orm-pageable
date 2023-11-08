import { Sort } from './sort.type';

export type PaginateQuery<T extends Record<string, unknown> = NonNullable<unknown>> = {
    currentPage: number;
    size: number;
    offset: number;
    unpaged: boolean;
    totalPages: number;
    totalItems: number;
    sortBy: Sort[];
    path: string;
} & T;

export type ExtendedPageable = PaginateQuery<{ limit?: number }>;
