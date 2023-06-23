import * as request from 'supertest';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { ApplicationModule } from './src/app.module';
import { Pageable, Sort } from '../src';
import { makeTestData } from './src/testData';
import { TestDto } from './src/test.dto';

const defaultPageable: Pageable = {
    currentPage: 1,
    offset: 0,
    size: 10,
    unpaged: false,
    totalPages: 100,
    totalItems: 1000,
    sortBy: []
};

describe('pageable', () => {
    let app: NestExpressApplication;
    let testData: TestDto[];

    beforeEach(async () => {
        testData = makeTestData();
        const express = require('express');
        const server = express();
        const adapter = new ExpressAdapter(server);
        app = await NestFactory.create<NestExpressApplication>(ApplicationModule, adapter, { logger: false });
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('should return the first page (size of 10) by default', () => {
        return request(app.getHttpServer())
            .get('/test')
            .expect(200)
            .expect({
                data: testData.slice(0, 10).map((t) => serialize(t)),
                meta: defaultPageable,
                links: {
                    current: '?page=1&limit=10',
                    next: '?page=2&limit=10',
                    last: '?page=100&limit=10'
                }
            });
    });

    it('should return the second page (size of 10)', () => {
        return request(app.getHttpServer())
            .get('/test?page=2')
            .expect(200)
            .expect({
                data: testData.slice(10, 20).map((t) => serialize(t)),
                meta: {
                    ...defaultPageable,
                    currentPage: 2,
                    offset: 10
                },
                links: {
                    first: '?page=1&limit=10',
                    previous: '?page=1&limit=10',
                    current: '?page=2&limit=10',
                    next: '?page=3&limit=10',
                    last: '?page=100&limit=10'
                }
            });
    });

    it('should return a non-existing page (page of MAX_SAFE_INTEGER / 10, size of 10) with an empty data array', () => {
        return request(app.getHttpServer())
            .get(`/test?page=${Math.floor(Number.MAX_SAFE_INTEGER / 10)}`)
            .expect(200)
            .expect({
                data: [],
                meta: {
                    ...defaultPageable,
                    currentPage: Math.floor(Number.MAX_SAFE_INTEGER / 10),
                    offset: (Math.floor(Number.MAX_SAFE_INTEGER / 10) - 1) * 10
                },
                links: {
                    first: '?page=1&limit=10',
                    previous: '?page=900719925474098&limit=10',
                    current: '?page=900719925474099&limit=10',
                    last: '?page=100&limit=10'
                }
            });
    });

    it('should return the first page (size of 1)', () => {
        return request(app.getHttpServer())
            .get('/test?size=1')
            .expect(200)
            .expect({
                data: testData.slice(0, 1).map((t) => serialize(t)),
                meta: {
                    ...defaultPageable,
                    size: 1,
                    totalPages: 1000
                },
                links: {
                    current: '?page=1&limit=1',
                    next: '?page=2&limit=1',
                    last: '?page=1000&limit=1'
                }
            });
    });

    describe('sorting', () => {
        it('should return the first page with sorting by id (DESC)', () => {
            return request(app.getHttpServer())
                .get('/test?sortBy=property[id];direction[desc];')
                .expect(200)
                .expect({
                    data: sortBy(testData, [{ property: 'id', direction: 'desc' }])
                        .slice(0, 10)
                        .map((t) => serialize(t)),
                    meta: {
                        ...defaultPageable,
                        sortBy: [
                            {
                                property: 'id',
                                direction: 'desc'
                            }
                        ]
                    },
                    links: {
                        current: '?page=1&limit=10',
                        next: '?page=2&limit=10',
                        last: '?page=100&limit=10'
                    }
                });
        });

        it('should return the first page with sorting by description (DESC, nulls first)', () => {
            return request(app.getHttpServer())
                .get('/test?sortBy=property[description];direction[desc];nulls-first[true];')
                .expect(200)
                .expect({
                    data: sortBy(testData, [{ property: 'description', direction: 'desc', nullsFirst: true }])
                        .slice(0, 10)
                        .map((t) => serialize(t)),
                    meta: {
                        ...defaultPageable,
                        sortBy: [
                            {
                                property: 'description',
                                direction: 'desc',
                                nullsFirst: true
                            }
                        ]
                    },
                    links: {
                        current: '?page=1&limit=10',
                        next: '?page=2&limit=10',
                        last: '?page=100&limit=10'
                    }
                });
        });

        it('should return the first page with sorting by description (DESC, nulls last) and by id (ASC)', () => {
            return request(app.getHttpServer())
                .get('/test?sortBy=property[description];direction[desc];nulls-first[false];&sortBy=property[id];direction[asc];')
                .expect(200)
                .expect({
                    data: sortBy(testData, [
                        { property: 'description', direction: 'desc', nullsFirst: false },
                        { property: 'id', direction: 'asc' }
                    ])
                        .slice(0, 10)
                        .map((t) => serialize(t)),
                    meta: {
                        ...defaultPageable,
                        sortBy: [
                            {
                                property: 'description',
                                direction: 'desc',
                                nullsFirst: false
                            },
                            {
                                property: 'id',
                                direction: 'asc'
                            }
                        ]
                    },
                    links: {
                        current: '?page=1&limit=10',
                        next: '?page=2&limit=10',
                        last: '?page=100&limit=10'
                    }
                });
        });

        describe('enableSort', () => {
            it('should not return sorted results when querying with sort but enableSort is false', () => {
                return request(app.getHttpServer())
                    .get('/test/enable-sort-false?sort=property[id];direction[desc];')
                    .expect(200)
                    .expect({
                        data: testData.slice(0, 10).map((t) => serialize(t)),
                        meta: defaultPageable,
                        links: {
                            current: '?page=1&limit=10',
                            next: '?page=2&limit=10',
                            last: '?page=100&limit=10'
                        }
                    });
            });
        });
    });

    describe('enableUnpaged', () => {
        it('should not return unpaged results when querying with unpaged by default', () => {
            return request(app.getHttpServer())
                .get('/test?unpaged=true')
                .expect(200)
                .expect({
                    data: testData.slice(0, 10).map((t) => serialize(t)),
                    meta: defaultPageable,
                    links: {
                        current: '?page=1&limit=10',
                        next: '?page=2&limit=10',
                        last: '?page=100&limit=10'
                    }
                });
        });
        it('should return unpaged results when querying with unpaged and enableUnpaged is true', () => {
            return request(app.getHttpServer())
                .get('/test/enable-unpaged-true?unpaged=true')
                .expect(200)
                .expect({
                    data: testData.map((t) => serialize(t)),
                    meta: {
                        ...defaultPageable,
                        currentPage: 0,
                        size: 0,
                        totalPages: null,
                        unpaged: true
                    },
                    links: {
                        first: '?page=1&limit=0',
                        current: '?page=0&limit=0',
                        next: '?page=1&limit=0',
                        last: '?page=Infinity&limit=0'
                    }
                });
        });
    });

    describe('enableSize', () => {
        it('should return the first page (size of 10) when querying size of 5 but enableSize is false', () => {
            return request(app.getHttpServer())
                .get('/test/enable-size-false?size=5')
                .expect(200)
                .expect({
                    data: testData.slice(0, 10).map((t) => serialize(t)),
                    meta: defaultPageable,
                    links: {
                        current: '?page=1&limit=10',
                        next: '?page=2&limit=10',
                        last: '?page=100&limit=10'
                    }
                });
        });
    });

    describe('limit', () => {
        it('should return five items on the second page (size of 10) when limit is set to 15', () => {
            return request(app.getHttpServer())
                .get('/test/limit-15?page=2')
                .expect(200)
                .expect({
                    data: testData.slice(10, 15).map((t) => serialize(t)),
                    meta: {
                        ...defaultPageable,
                        currentPage: 2,
                        offset: 10,
                        totalPages: 2,
                        totalItems: 15
                    },
                    links: {
                        first: '?page=1&limit=10',
                        previous: '?page=1&limit=10',
                        current: '?page=2&limit=10'
                    }
                });
        });
    });

    describe('maxSize', () => {
        it('should return the first page (size of 5) when querying size of 10 but maxSize is 5', () => {
            return request(app.getHttpServer())
                .get('/test/max-size-5?size=10')
                .expect(200)
                .expect({
                    data: testData.slice(0, 5).map((t) => serialize(t)),
                    meta: {
                        ...defaultPageable,
                        size: 5,
                        totalPages: 200
                    },
                    links: {
                        current: '?page=1&limit=5',
                        next: '?page=2&limit=5',
                        last: '?page=200&limit=5'
                    }
                });
        });
    });

    describe('limit & unpaged', () => {});
});

function serialize({ id, title, description, createdAt, updatedAt }: TestDto) {
    return {
        id,
        title,
        description,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString()
    };
}

function sortBy(testDtos: TestDto[], sorts: Sort[]) {
    for (let i = 0; i < sorts.length; i++) {
        testDtos.sort((a, b) => {
            const propsToCheck = sorts.slice(0, i).map((sort) => sort.property) as (keyof TestDto)[];
            if (propsToCheck.every((prop) => a[prop] === b[prop])) {
                const aProp = a[sorts[i].property as keyof TestDto];
                const bProp = b[sorts[i].property as keyof TestDto];
                if (aProp === null && bProp === null) {
                    return 1;
                }
                if (aProp === null) {
                    return sorts[i].nullsFirst ? -1 : 1;
                }
                if (bProp === null) {
                    return sorts[i].nullsFirst ? 1 : -1;
                }
                if (sorts[i].direction === 'asc') {
                    return aProp < bProp ? -1 : 1;
                }
                return aProp > bProp ? -1 : 1;
            }
            return 1;
        });
    }
    return testDtos;
}
