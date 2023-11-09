import { EntityRepository, QueryBuilder } from '@mikro-orm/knex';
import { Dictionary } from '@mikro-orm/core';
import { DriverName, ExtendedPaginateQuery, PaginateConfig, Paginated, Relation } from './types';
import { getAlias, getQBQueryOrderMap, getQueryUrlComponents } from './helpers';

export class PageFactory<TEntity extends object, TOutput extends object = TEntity, TPage = Paginated<TOutput>> {
    protected driverName: DriverName | string;
    protected isEntityRepository: boolean;
    protected readonly pageable: ExtendedPaginateQuery;

    constructor(
        pageable: ExtendedPaginateQuery,
        protected repo: EntityRepository<TEntity> | QueryBuilder<TEntity>,
        protected _config: PaginateConfig<TEntity> = {},
        protected _map: (entity: TEntity & Dictionary) => TOutput & Dictionary = (entity) => entity as unknown as TOutput & Dictionary
    ) {
        this.pageable = pageable;
        if (this.repo.constructor.name === 'QueryBuilder') {
            this.driverName = (this.repo as any).driver.constructor.name;
            this.isEntityRepository = false;
        } else {
            this.driverName = (repo as EntityRepository<TEntity>).getEntityManager().getDriver().constructor.name;
            this.isEntityRepository = true;
        }
    }

    public map<TMappedOutput extends object, TMappedPage = Paginated<TMappedOutput>>(mapper: (entity: TEntity & Dictionary) => TMappedOutput): PageFactory<TEntity, TMappedOutput, TMappedPage> {
        return new PageFactory<TEntity, TMappedOutput, TMappedPage>(this.pageable, this.repo, this._config, mapper);
    }

    public config(config: PaginateConfig<TEntity>): PageFactory<TEntity, TOutput, TPage> {
        this._config = config;
        return this;
    }

    public async create(): Promise<TPage> {
        const { select, sortable, relations, where, alias } = this._config;
        const queryBuilder: QueryBuilder<TEntity> = this.isEntityRepository ? (this.repo as EntityRepository<TEntity>).createQueryBuilder(alias) : (this.repo as QueryBuilder<TEntity>);
        let { currentPage, offset, size, sortBy } = this.pageable;
        const { unpaged, limit } = this.pageable;
        if (unpaged) {
            currentPage = 0;
            offset = 0;
            size = 0;
        }

        if (undefined !== select) {
            queryBuilder.select(select);
        }

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

        // TODO: This is generating an issue when using query builder, it order not correctly
        // queryBuilder.orderBy(getQBQueryOrderMap(sortBy, this.driverName));

        if (!unpaged) {
            const difference = offset + size - totalItems;
            queryBuilder.offset(offset).limit(size - (difference > 0 ? difference : 0));
        }

        const { queryOrigin, queryPath } = getQueryUrlComponents(this.pageable.path);
        const path: string = queryOrigin + queryPath;

        const result = await queryBuilder.getResultList();
        const data = result.map(this._map);
        const totalPages = Math.ceil(totalItems / size);

        const options = `&limit=${size}`;
        const buildLink = (p: number): string => path + '?page=' + p + options;

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
