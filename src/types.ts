import { GroupOperator, QBFilterQuery, QueryOperator, QueryOrder } from '@mikro-orm/core';

export type DriverName = 'PostgreSqlDriver' | 'MySqlDriver' | 'MariaDbDriver' | 'SqliteDriver';

export interface Links {
    first?: string;
    previous?: string;
    current: string;
    next?: string;
    last?: string;
}

export type PaginateQuery<T extends Record<string, unknown> = NonNullable<unknown>> = {
    currentPage: number;
    itemsPerPage: number;
    offset: number;
    unpaged: boolean;
    totalPages: number;
    totalItems: number;
    sortBy: Sort[];
    url?: URL | undefined;
    filter: { [column: string]: unknown };
} & T;

export type ExtendedPaginateQuery = PaginateQuery<{ limit?: number }>;

export interface Paginated<T extends object> {
    data: T[];
    meta: PaginateQuery;
    links: Links;
}

export type PaginateOptions = {
    enableUnpaged?: boolean;
    enableSize?: boolean;
    enableSort?: boolean;
    limit?: number | null;
    maxSize?: number;
};

export type PaginateDataQuery = Partial<Omit<PaginateQuery, 'offset' | 'totalPages' | 'totalItems'> & PaginateOptions>;

export type Relation = {
    property: string;
    alias?: string;
    type?: 'leftJoin' | 'innerJoin' | 'pivotJoin';
    andSelect?: boolean;
    cond?: QBFilterQuery;
    path?: string;
};

export type Sort = {
    property: string;
    direction: QueryOrder.asc | QueryOrder.desc;
    nullsFirst?: boolean;
};

export type PaginateConfig<T extends object> = {
    alias?: string;
    sortable?: (Extract<keyof T, string> | string)[] | null;
    select?: Extract<keyof T, string> | string | (Extract<keyof T, string> | string)[];
    relations?: Relation | Relation[];
    where?: QBFilterQuery<T>;
};

export type ColumnProperties = { propertyPath?: string; propertyName: string; isNested: boolean; column: string };

export interface FilterToken {
    comparator: keyof typeof GroupOperator;
    suffix?: keyof typeof QueryOperator;
    operator: keyof typeof QueryOperator;
    value: string | string[] | Date | undefined;
}

export type ColumnsFilters = { [columnName: string]: FilterToken[] };

export interface PredicateOperator {
    operator: string | undefined;
    parameters: string[];
}
