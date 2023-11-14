import type { Request as ExpressRequest } from 'express';
import { ColumnProperties, DriverName, Sort } from './types';
import { QBQueryOrderMap, QueryOrder } from '@mikro-orm/core';
import { QueryBuilder } from '@mikro-orm/knex';

export function isRecord(data: unknown): data is Record<string, unknown> {
    return data !== null && typeof data === 'object' && !Array.isArray(data);
}

export function isExpressRequest(request: unknown): request is ExpressRequest {
    return isRecord(request) && typeof request.get === 'function';
}

export function getAlias(property: string): string {
    return property.split('.').pop() ?? property;
}

export function getQBQueryOrderMap<TEntity extends object>(sortBy: Sort[], driverName: DriverName | string): QBQueryOrderMap<TEntity> {
    if (driverName === 'MySqlDriver' || driverName === 'MariaDbDriver') {
        return sortBy.reduce(
            (acc, s) => ({
                ...acc,
                ...(s.nullsFirst !== undefined && { [`ISNULL(${s.property})`]: s.nullsFirst ? QueryOrder.DESC : QueryOrder.ASC }),
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

export function getQueryOrder(direction: QueryOrder.asc | QueryOrder.desc, nullsFirst?: boolean): QueryOrder {
    if (nullsFirst === undefined) {
        return direction === QueryOrder.asc ? QueryOrder.ASC : QueryOrder.DESC;
    }
    return nullsFirst
        ? direction === QueryOrder.asc
            ? QueryOrder.ASC_NULLS_FIRST
            : QueryOrder.DESC_NULLS_FIRST
        : direction === QueryOrder.asc
        ? QueryOrder.ASC_NULLS_LAST
        : QueryOrder.DESC_NULLS_LAST;
}

export function getPropertiesByColumnName(column: string): ColumnProperties {
    const propertyPath = column.split('.');
    if (propertyPath.length > 1) {
        const propertyNamePath = propertyPath.slice(1);
        let isNested = false,
            propertyName = propertyNamePath.join('.');

        if (!propertyName.startsWith('(') && propertyNamePath.length > 1) {
            isNested = true;
        }

        propertyName = propertyName.replace('(', '').replace(')', '');

        return {
            propertyPath: propertyPath[0],
            propertyName, // the join is in case of an embedded entity
            isNested,
            column: `${propertyPath[0]}.${propertyName}`
        };
    } else {
        return { propertyName: propertyPath[0], isNested: false, column: propertyPath[0] };
    }
}

const isoDateRegExp = new RegExp(
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/
);

export function isISODate(str: string): boolean {
    return isoDateRegExp.test(str);
}

export const getKeyByValue = (object: object, value: string) => Object.keys(object).find((key) => object[key as keyof typeof object] === value) as keyof typeof object;

export function fixColumnAlias<T extends object>(properties: ColumnProperties, qb: QueryBuilder<T>) {
    if (properties.isNested) {
        if (properties.propertyName.includes('.')) {
            const aliases = qb['_aliases'];
            const propertyPath = properties.propertyName.split('.');
            const alias = Object.keys(aliases).filter((k) => k.toLowerCase() === propertyPath[0])[0];
            return `${alias}.${propertyPath[1]}`;
        }
        return `${qb.alias}_${properties.propertyPath}_rel_${properties.propertyName}`;
    } else if (properties.column.includes('.')) {
        const aliases = qb['_aliases'];
        const propertyPath = properties.column.split('.');
        const alias = Object.keys(aliases).filter((k) => k.toLowerCase() === propertyPath[0])[0];
        return `${alias}.${propertyPath[1]}`;
    }

    return `${qb.alias}.${properties.propertyName}`;
}
