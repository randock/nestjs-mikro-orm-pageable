import { Links, Page, Pageable } from '../types';
import { ApiProperty } from '@nestjs/swagger';
import { defaultPageable } from '../constants';

export class PageableResponse<T extends object> implements Page<T> {
    @ApiProperty()
    readonly data!: T[];

    @ApiProperty({
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 0 },
            size: { type: 'integer', minimum: 0 },
            offset: { type: 'integer', minimum: 0 },
            unpaged: { type: 'boolean' },
            totalPages: { type: 'integer', minimum: 0 },
            totalItems: { type: 'integer', minimum: 0 },
            sortBy: { type: 'array', items: { type: 'object' } }
        },
        example: defaultPageable
    })
    readonly meta!: Pageable;

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
