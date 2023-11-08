import { PaginateQuery } from './pageable.type';

export interface Links {
    first?: string;
    previous?: string;
    current: string;
    next?: string;
    last?: string;
}

export interface Paginated<T extends object> {
    data: T[];
    meta: PaginateQuery;
    links: Links;
}
