import type { Request as ExpressRequest } from 'express';
import { DriverName, Sort, SortDirection } from './types';
import { QBQueryOrderMap, QueryOrder } from '@mikro-orm/core';

export function isRecord(data: unknown): data is Record<string, unknown> {
    return data !== null && typeof data === 'object' && !Array.isArray(data);
}

export function isExpressRequest(request: unknown): request is ExpressRequest {
    return isRecord(request) && typeof request.get === 'function';
}

export function getQueryUrlComponents(path: string): { queryOrigin: string; queryPath: string } {
    const r = new RegExp('^(?:[a-z+]+:)?//', 'i');
    let queryOrigin = '';
    let queryPath = '';
    if (r.test(path)) {
        const url = new URL(path);
        queryOrigin = url.origin;
        queryPath = url.pathname;
    } else {
        queryPath = path;
    }
    return { queryOrigin, queryPath };
}

export function getAlias(property: string): string {
    return property.split('.').pop() ?? property;
}

export function getQBQueryOrderMap<TEntity extends object>(sortBy: Sort[], driverName: DriverName | string): QBQueryOrderMap<TEntity> {
    if (driverName === 'MySqlDriver' || driverName === 'MariaDbDriver') {
        return sortBy.reduce(
            (acc, s) => ({
                ...acc,
                ...(s.nullsFirst !== undefined && { [`ISNULL(${s.property})`]: s.nullsFirst ? 'DESC' : 'ASC' }),
                [s.property]: s.direction
            }),
            {} as QBQueryOrderMap<TEntity>
        );
    }
    return sortBy.reduce(
        (acc, s) => ({
            ...acc,
            [s.property]: getQueryOrder(s.direction, s.nullsFirst)
        }),
        {} as QBQueryOrderMap<TEntity>
    );
}

export function getQueryOrder(direction: SortDirection, nullsFirst?: boolean): QueryOrder {
    if (nullsFirst === undefined) {
        return direction === 'asc' ? QueryOrder.ASC : QueryOrder.DESC;
    }
    return nullsFirst ? (direction === 'asc' ? QueryOrder.ASC_NULLS_FIRST : QueryOrder.DESC_NULLS_FIRST) : direction === 'asc' ? QueryOrder.ASC_NULLS_LAST : QueryOrder.DESC_NULLS_LAST;
}
