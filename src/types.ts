import { QBFilterQuery, QueryOrder } from '@mikro-orm/core';
import { GroupOperator, QueryOperator } from '@mikro-orm/core/enums';

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
    size: number;
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
    type?: 'leftJoin' | 'innerJoin' | 'pivotJoin';
    alias?: string;
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
    comparator: GroupOperator;
    suffix?: QueryOperator;
    operator: QueryOperator;
    value: string | undefined;
}

export type FindOperator = {
    type: string;
    value: string | string[] | Date;
};

export type Filter = {
    comparator: GroupOperator;
    findOperator: FindOperator | undefined;
};

export type ColumnsFilters = { [columnName: string]: Filter[] };

export interface PredicateOperator {
    operator: string | undefined;
    parameters: string[];
}
