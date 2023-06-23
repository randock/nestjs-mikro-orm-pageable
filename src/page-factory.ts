import { EntityRepository, QueryBuilder } from '@mikro-orm/knex';
import { Dictionary, GetRepository, QBFilterQuery, QBQueryOrderMap, QueryOrder } from '@mikro-orm/core';
import { DriverName, ExtendedPageable, Page, Relation, Sort, SortDirection } from './types';

type PageFactoryConfig<T extends object> = {
    alias?: string;
    sortable?: (Extract<keyof T, string> | string)[] | null;
    select?: Extract<keyof T, string> | string | (Extract<keyof T, string> | string)[];
    relations?: Relation | Relation[];
    where?: QBFilterQuery<T>;
};

export class PageFactory<TEntity extends object, TOutput extends object = TEntity, TPage = Page<TOutput>> {
    protected driverName: DriverName | string;

    constructor(
        protected pageable: ExtendedPageable,
        protected repo: EntityRepository<TEntity> | QueryBuilder<TEntity>,
        protected _config: PageFactoryConfig<TEntity> = {},
        protected _map: (entity: TEntity & Dictionary) => TOutput & Dictionary = (entity) => entity as unknown as TOutput & Dictionary
    ) {
        this.driverName = repo instanceof QueryBuilder ? '' : repo.getEntityManager().getDriver().constructor.name;
    }

    map<TMappedOutput extends object, TMappedPage = Page<TMappedOutput>>(mapper: (entity: TEntity & Dictionary) => TMappedOutput): PageFactory<TEntity, TMappedOutput, TMappedPage> {
        return new PageFactory<TEntity, TMappedOutput, TMappedPage>(this.pageable, this.repo, this._config, mapper);
    }

    config(config: PageFactoryConfig<TEntity>): PageFactory<TEntity, TOutput, TPage> {
        this._config = config;
        return this;
    }

    async create(): Promise<TPage> {
        const { select = '*', sortable, relations, where, alias } = this._config;
        const queryBuilder = this.repo instanceof QueryBuilder ? this.repo : this.repo.createQueryBuilder(alias);
        let { currentPage, offset, size, sortBy } = this.pageable;
        const { unpaged, limit } = this.pageable;
        if (unpaged) {
            currentPage = 0;
            offset = 0;
            size = 0;
        }

        queryBuilder.select(select);

        const applyRelation = (relation: Relation) => {
            queryBuilder[relation.andSelect ? 'joinAndSelect' : 'join'](relation.property, relation.alias ?? getAlias(relation.property), relation.cond, relation.type, relation.path);
        };

        Array.isArray(relations) ? relations.forEach(applyRelation) : relations && applyRelation(relations);

        if (where) {
            queryBuilder.where(where);
        }

        let totalItems = await queryBuilder.getCount();

        if (limit !== undefined) {
            queryBuilder.limit(limit);
            totalItems = Math.min(totalItems, limit);
        }

        sortBy = sortBy.filter((s) => sortable?.includes(s.property) ?? true);

        queryBuilder.orderBy(getQBQueryOrderMap(sortBy, this.driverName));

        if (!unpaged) {
            const difference = offset + size - totalItems;
            queryBuilder.offset(offset).limit(size - (difference > 0 ? difference : 0));
        }

        const result = await queryBuilder.getResultList();
        const data = result.map(this._map);
        const totalPages = Math.ceil(totalItems / size);

        const options = `&limit=${size}`;
        const buildLink = (p: number): string => '?page=' + p + options;

        return {
            data,
            meta: {
                currentPage,
                offset,
                size,
                unpaged,
                totalPages,
                totalItems,
                sortBy
            },
            links: {
                first: currentPage == 1 ? undefined : buildLink(1),
                previous: currentPage - 1 < 1 ? undefined : buildLink(currentPage - 1),
                current: buildLink(currentPage),
                next: currentPage + 1 > totalPages ? undefined : buildLink(currentPage + 1),
                last: currentPage == totalPages || !totalItems ? undefined : buildLink(totalPages)
            }
        } as TPage;
    }
}

function getAlias(property: string): string {
    return property.split('.').pop() ?? property;
}

function getQBQueryOrderMap<TEntity extends object>(sortBy: Sort[], driverName: DriverName | string): QBQueryOrderMap<TEntity> {
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

function getQueryOrder(direction: SortDirection, nullsFirst?: boolean): QueryOrder {
    if (nullsFirst === undefined) {
        return direction === 'asc' ? QueryOrder.ASC : QueryOrder.DESC;
    }
    return nullsFirst ? (direction === 'asc' ? QueryOrder.ASC_NULLS_FIRST : QueryOrder.DESC_NULLS_FIRST) : direction === 'asc' ? QueryOrder.ASC_NULLS_LAST : QueryOrder.DESC_NULLS_LAST;
}
