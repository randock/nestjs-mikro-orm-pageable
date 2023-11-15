import { Links, Paginated, PaginateQuery } from '../types';
import { ApiProperty } from '@nestjs/swagger';
import { defaultPaginate } from '../constants';

export class PaginateResponse<T extends object> implements Paginated<T> {
    @ApiProperty()
    readonly data!: T[];

    @ApiProperty({
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 0 },
            itemsPerPage: { type: 'integer', minimum: 0 },
            offset: { type: 'integer', minimum: 0 },
            unpaged: { type: 'boolean' },
            totalPages: { type: 'integer', minimum: 0 },
            totalItems: { type: 'integer', minimum: 0 },
            sortBy: { type: 'array', items: { type: 'object' } }
        },
        example: defaultPaginate
    })
    readonly meta!: PaginateQuery;

    @ApiProperty({
        type: 'object',
        properties: {
            first: { type: 'string', nullable: true },
            previous: { type: 'string', nullable: true },
            current: { type: 'string', nullable: true },
            next: { type: 'string', nullable: true },
            last: { type: 'string', nullable: true }
        }
    })
    readonly links!: Links;
}
