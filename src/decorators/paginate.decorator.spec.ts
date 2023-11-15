import { CustomParamFactory } from '@nestjs/common/interfaces';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { PaginateDataQuery, PaginateQuery } from '../types';
import { Paginate } from './paginate.decorator';
import { DEFAULT_MAX_SIZE } from '../constants';
import { QueryOrder } from '@mikro-orm/core';

function getParamDecoratorFactory<TData, TOutput>(decorator: Function): CustomParamFactory<TData, any, TOutput> {
    class Test {
        public test(@decorator() _value: TOutput): void {}
    }

    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
    return args[Object.keys(args)[0]].factory;
}

const decoratorFactory = getParamDecoratorFactory<Partial<PaginateDataQuery>, PaginateQuery>(Paginate);

function contextFactory(query: unknown) {
    return {
        switchToHttp: () => ({
            getRequest: () => ({
                query
            })
        })
    };
}

const defaultPageable: PaginateQuery = {
    currentPage: 1,
    itemsPerPage: 10,
    offset: 0,
    totalPages: 0,
    totalItems: 0,
    unpaged: false,
    sortBy: [],
    filter: {}
};

describe('PageableDefault', () => {
    it('should return default values when empty query is provided', () => {
        const context = contextFactory({});
        const pageable = decoratorFactory({}, context);
        expect(pageable).toEqual({
            currentPage: 1,
            itemsPerPage: 10,
            offset: 0,
            totalPages: 0,
            totalItems: 0,
            unpaged: false,
            sortBy: []
        });
    });
    it('should return custom default values when empty query is provided', () => {
        const context = contextFactory({});
        const pageable = decoratorFactory(
            {
                currentPage: 1,
                itemsPerPage: 20,
                unpaged: true,
                sortBy: [
                    {
                        property: 'test',
                        direction: QueryOrder.asc,
                        nullsFirst: true
                    }
                ]
            },
            context
        );
        expect(pageable).toEqual({
            currentPage: 1,
            itemsPerPage: 20,
            offset: 0,
            totalPages: 0,
            totalItems: 0,
            unpaged: true,
            sortBy: [
                {
                    property: 'test',
                    direction: 'asc',
                    nullsFirst: true
                }
            ]
        });
    });
    it.each([
        {
            query: {
                page: '1',
                itemsPerPage: '20',
                sortBy: 'property[test];direction[asc];nulls-first[true]'
            },
            expected: {
                currentPage: 1,
                itemsPerPage: 20,
                offset: 0,
                totalPages: 0,
                totalItems: 0,
                unpaged: false,
                sortBy: [
                    {
                        property: 'test',
                        direction: 'asc',
                        nullsFirst: true
                    }
                ]
            }
        },
        {
            query: {
                page: '2',
                itemsPerPage: '4',
                sortBy: ['property[test];direction[asc];nulls-first[true]', 'property[@!*#-test2];direction[desc];nulls-first[false]', 'property[_test 3_];direction[asc]']
            },
            expected: {
                currentPage: 2,
                itemsPerPage: 4,
                offset: 4,
                totalPages: 0,
                totalItems: 0,
                unpaged: false,
                sortBy: [
                    {
                        property: 'test',
                        direction: 'asc',
                        nullsFirst: true
                    },
                    {
                        property: '@!*#-test2',
                        direction: 'desc',
                        nullsFirst: false
                    },
                    {
                        property: '_test 3_',
                        direction: 'asc'
                    }
                ]
            }
        }
    ])('should return parsed values when query is provided', ({ query, expected }) => {
        const context = contextFactory(query);
        const pageable = decoratorFactory({}, context);
        expect(pageable).toEqual(expected);
    });
    describe('invalid input values', () => {
        it.each([
            {
                defaultValues: {
                    currentPage: 1,
                    itemsPerPage: -20,
                    unpaged: true,
                    sortBy: []
                },
                expected: {
                    ...defaultPageable,
                    currentPage: 1,
                    offset: 0,
                    unpaged: true
                }
            },
            {
                defaultValues: {
                    currentPage: -1,
                    itemsPerPage: 20,
                    unpaged: false,
                    sortBy: []
                },
                expected: {
                    ...defaultPageable,
                    itemsPerPage: 20
                }
            },
            {
                defaultValues: {
                    currentPage: Number.MAX_SAFE_INTEGER + 1
                },
                expected: {
                    ...defaultPageable
                }
            },
            {
                defaultValues: {
                    itemsPerPage: DEFAULT_MAX_SIZE + 1
                },
                expected: {
                    ...defaultPageable
                }
            },
            {
                defaultValues: {
                    currentPage: Math.floor(Number.MAX_SAFE_INTEGER / 2),
                    itemsPerPage: 3
                },
                expected: {
                    ...defaultPageable
                }
            },
            {
                defaultValues: {
                    currentPage: 0.1234567,
                    itemsPerPage: 9.87654321
                },
                expected: {
                    ...defaultPageable
                }
            }
        ])('should ignore invalid custom default values', ({ defaultValues, expected }) => {
            const context = contextFactory({});
            const pageable = decoratorFactory(defaultValues, context);
            expect(pageable).toEqual(expected);
        });
        it.each([
            {
                query: {
                    page: '1',
                    itemsPerPage: '-20',
                    unpaged: 'abc'
                },
                expected: {
                    ...defaultPageable
                }
            },
            {
                query: {
                    page: '-1',
                    itemsPerPage: '20',
                    sortBy: 'property[test];direction[xyz];nulls-first[true]'
                },
                expected: {
                    ...defaultPageable,
                    itemsPerPage: 20
                }
            },
            {
                query: {
                    page: 'abc',
                    itemsPerPage: 'xyz',
                    sortBy: 'property[a.b];direction[asc];nulls-first[true]'
                },
                expected: {
                    ...defaultPageable,
                    sortBy: [
                        {
                            property: 'a.b',
                            direction: 'asc',
                            nullsFirst: true
                        }
                    ]
                }
            },
            {
                query: {
                    page: `${Number.MAX_SAFE_INTEGER + 1}`
                },
                expected: {
                    ...defaultPageable
                }
            },
            {
                query: {
                    itemsPerPage: `${Number.MAX_SAFE_INTEGER + 1}`
                },
                expected: {
                    ...defaultPageable
                }
            },
            {
                query: {
                    page: `${Math.floor(Number.MAX_SAFE_INTEGER / 2)}`,
                    itemsPerPage: '3'
                },
                expected: {
                    ...defaultPageable
                }
            }
        ])('should ignore invalid query values', ({ query, expected }) => {
            const context = contextFactory(query);
            const pageable = decoratorFactory({}, context);
            expect(pageable).toEqual(expected);
        });
    });
});
