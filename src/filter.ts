import { QueryBuilder } from '@mikro-orm/knex';
import { ColumnsFilters, FilterToken, PaginateQuery } from './types';
import { QueryOperator, GroupOperator } from '@mikro-orm/core';
import { createWhereConditionExpression, fixColumnAlias, fixQueryParam, generatePredicateCondition, getPropertiesByColumnName, isISODate } from './helpers';

export function isOperator(value: string): value is QueryOperator {
    return Object.values(QueryOperator).includes(value as QueryOperator);
}

export function parseFilterToken(raw?: string): FilterToken | null {
    if (raw === undefined || raw === null) {
        return null;
    }

    const token: FilterToken = {
        comparator: GroupOperator.$and,
        suffix: undefined,
        operator: QueryOperator.$eq,
        value: raw
    };

    const MAX_OPERTATOR = 4; // max 4 operator es: $and:$not:$eq:$null
    const OPERAND_SEPARATOR = ':';

    const matches = raw.split(OPERAND_SEPARATOR);
    const maxOperandCount = matches.length > MAX_OPERTATOR ? MAX_OPERTATOR : matches.length;
    const notValue: (GroupOperator | QueryOperator)[] = [];

    for (let i = 0; i < maxOperandCount; i++) {
        const match = matches[i].replace('$', '');
        if (match === GroupOperator.$and || match === GroupOperator.$or) {
            token.comparator = match;
        } else if (match === QueryOperator.$not) {
            token.suffix = match;
        } else if (isOperator(match)) {
            token.operator = match;
        } else {
            break;
        }
        notValue.push(match);
    }

    if (notValue.length) {
        token.value = token.operator !== QueryOperator.$exists ? raw.replace(`${notValue.join(OPERAND_SEPARATOR)}${OPERAND_SEPARATOR}`, '').replace('$', '') : undefined;
    }

    return token;
}

export function parseFilter(query: PaginateQuery): ColumnsFilters {
    if (!query.filter) {
        return {};
    }

    const filters: ColumnsFilters = {};
    Object.keys(query.filter).map((column) => {
        const input = query.filter[column];
        const statements = !Array.isArray(input) ? [input] : input;
        statements.map((raw) => {
            const token = parseFilterToken(raw);
            if (!token) {
                return;
            }

            const params: (typeof filters)[0][0] = {
                comparator: token.comparator,
                findOperator: undefined
            };

            const fixValue = (value: string) => (isISODate(value) ? new Date(value) : value);

            switch (token.operator) {
                case QueryOperator.$in:
                case QueryOperator.$contains:
                    params.findOperator = {
                        type: token.operator,
                        value: token.value?.split(',') as string[]
                    };
                    break;
                case QueryOperator.$ilike:
                    params.findOperator = {
                        type: token.operator,
                        value: `%${token.value}%`
                    };
                    break;
                default:
                    params.findOperator = {
                        type: token.operator,
                        value: fixValue(token.value as string)
                    };
                    break;
            }
            filters[column] = [...(filters[column] || []), params];
        });
    });

    return filters;
}

export function addWhereCondition<T extends object>(qb: QueryBuilder<T>, column: string, filter: ColumnsFilters) {
    const columnProperties = getPropertiesByColumnName(column);
    const alias = fixColumnAlias(columnProperties, qb);

    filter[column].map((columnFilter, index) => {
        const columnNamePerIteration = `${columnProperties.column}.${index}`;
        const condition = generatePredicateCondition(columnFilter, alias);
        const parameters = fixQueryParam(alias, columnNamePerIteration, condition, {
            [columnNamePerIteration]: columnFilter.findOperator?.value
        });

        if (columnFilter.comparator === GroupOperator.$or) {
            qb.orWhere(createWhereConditionExpression(condition, parameters[columnNamePerIteration]));
        } else {
            qb.andWhere(createWhereConditionExpression(condition, parameters[columnNamePerIteration]));
        }
    });
}

export function addFilter<T extends object>(qb: QueryBuilder<T>, query: PaginateQuery): QueryBuilder<T> {
    const filter = parseFilter(query);
    const filterEntries = Object.entries(filter);

    filterEntries.map(([column]) => {
        addWhereCondition(qb, column, filter);
    });

    return qb;
}
