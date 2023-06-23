import { Pageable } from './pageable.type';

export interface Links {
    first?: string;
    previous?: string;
    current: string;
    next?: string;
    last?: string;
}

export interface Page<T extends object> {
    data: T[];
    meta: Pageable;
    links: Links;
}
