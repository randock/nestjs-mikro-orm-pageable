import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginateDataQuery, Sort, ExtendedPaginateQuery } from '../types';
import { defaultPaginate, defaultPaginateOptions, sortRegex } from '../constants';
import { isExpressRequest } from '../helpers';
import type { Request as ExpressRequest } from 'express';
import type { FastifyRequest } from 'fastify';
import { QueryOrder } from '@mikro-orm/core';

export const Paginate = createParamDecorator((data: PaginateDataQuery, ctx: ExecutionContext): ExtendedPaginateQuery => {
    const { currentPage: defaultPage, size: defaultSize, enableUnpaged, enableSize, enableSort, maxSize, limit, ...defaultData } = { ...defaultPaginateOptions, ...data };
    const request: ExpressRequest | FastifyRequest = ctx.switchToHttp().getRequest();

    const pageable: ExtendedPaginateQuery = {
        ...defaultPaginate,
        ...defaultData
    };

    if (!hasQuery(request)) {
        return pageable;
    }

    const { query } = request;

    // Determine if Express or Fastify to rebuild the original url and reduce down to protocol, host and base url
    let originalUrl: string;
    if (isExpressRequest(request)) {
        originalUrl = request.protocol + '://' + request.get('host') + request.originalUrl;
    } else {
        originalUrl = request.protocol + '://' + request.hostname + request.url;
    }
    const urlParts = new URL(originalUrl);
    pageable.path = urlParts.protocol + '//' + urlParts.host + urlParts.pathname;

    const parsedPageInt = hasParam(query, 'page') ? maybeParseIntParam(query.page) : undefined;
    const page = isSafePositiveInteger(parsedPageInt) ? parsedPageInt : isSafePositiveInteger(defaultPage) ? defaultPage : pageable.currentPage;
    const pageIndex = page - 1;

    const parsedSizeInt = enableSize && hasParam(query, 'limit') ? maybeParseIntParam(query.limit) : undefined;
    const size =
        isSafePositiveInteger(parsedSizeInt) && parsedSizeInt <= maxSize
            ? parsedSizeInt
            : isSafePositiveInteger(defaultSize) && defaultSize <= maxSize
            ? defaultSize
            : pageable.size <= maxSize
            ? pageable.size
            : maxSize;

    let offset: number | undefined = pageIndex * size;
    if (!isSafeNonNegativeInteger(offset)) {
        offset = undefined;
    }

    if (offset !== undefined) {
        pageable.currentPage = page;
        pageable.size = size;
        pageable.offset = offset;
    }

    if (enableSort && hasParam(query, 'sortBy')) {
        const parsedSort = maybeParseSortParam(query.sortBy);
        if (parsedSort) {
            pageable.sortBy = parsedSort;
        }
    }

    if (enableUnpaged && hasParam(query, 'unpaged')) {
        const parsedBool = maybeParseBoolParam(query.unpaged);
        if (parsedBool !== undefined) {
            pageable.unpaged = parsedBool;
        }
    }

    if (limit !== null) {
        pageable.limit = limit;
    }

    return pageable;
});

function hasQuery(request: unknown): request is { query: unknown } {
    return (request as { query: unknown }).query !== undefined;
}

function hasParam<T extends string>(query: unknown, param: T): query is { [key in T]: unknown } {
    return typeof query === 'object' && query !== null && param in query;
}

function maybeParseIntParam(param: unknown): number | undefined {
    let parsedString: string | undefined;
    if (typeof param === 'string') {
        parsedString = param;
    } else if (Array.isArray(param) && param.length && typeof param[0] === 'string') {
        parsedString = param[0];
    }
    if (parsedString?.match(/^\d+$/)) {
        const parsed = parseInt(parsedString, 10);
        if (!isNaN(parsed)) {
            return parsed;
        }
    }
}

function maybeParseBoolParam(param: unknown): boolean | undefined {
    let parsedString: string | undefined;
    if (typeof param === 'string') {
        parsedString = param;
    } else if (Array.isArray(param) && param.length && typeof param[0] === 'string') {
        parsedString = param[0];
    }
    if (parsedString === 'true') {
        return true;
    } else if (parsedString === 'false') {
        return false;
    }
}

function maybeParseSortParam(param: unknown): Sort[] | undefined {
    const parsedStrings: string[] = [];
    if (typeof param === 'string') {
        parsedStrings.push(param);
    } else if (Array.isArray(param) && param.length) {
        param.forEach((value) => {
            typeof value === 'string' && parsedStrings.push(value);
        });
    }
    if (!parsedStrings.length) {
        return;
    }
    return removeSortDuplicates(parsedStrings.map(maybeParseSortString).filter((sort): sort is Sort => !!sort));
}

function maybeParseSortString(sortString: string): Sort | undefined {
    const parts = sortString.split(';');
    let property: string | undefined;
    let direction: QueryOrder.asc | QueryOrder.desc | undefined;
    let nullsFirst: boolean | undefined = undefined;
    parts.forEach((part) => {
        const propertyMatch = part.match(sortRegex.property);
        if (propertyMatch) {
            property = propertyMatch.groups?.property;
            return;
        }
        const directionMatch = part.match(sortRegex.direction);
        if (directionMatch) {
            direction = directionMatch.groups?.direction as QueryOrder.asc | QueryOrder.desc;
            return;
        }
        const nullsFirstMatch = part.match(sortRegex.nullsFirst);
        if (nullsFirstMatch) {
            nullsFirst = nullsFirstMatch.groups?.nullsFirst === 'true';
            return;
        }
    });
    if (property && direction) {
        return {
            property,
            direction,
            nullsFirst
        };
    }
}

function removeSortDuplicates(sortArray: Sort[]): Sort[] {
    const columnMap = new Map<string, Sort>();

    for (const sort of sortArray) {
        columnMap.set(sort.property, sort);
    }

    return Array.from(columnMap.values());
}

function isSafeInteger(num: number | undefined): num is number {
    return num !== undefined && Number.isSafeInteger(num);
}

function isSafeNonNegativeInteger(num: number | undefined): num is number {
    return isSafeInteger(num) && num >= 0;
}

function isSafePositiveInteger(num: number | undefined): num is number {
    return isSafeInteger(num) && num > 0;
}
