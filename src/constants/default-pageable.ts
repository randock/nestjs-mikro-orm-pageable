import { Pageable } from '../types';

export const defaultPageable: Pageable = {
    currentPage: 1,
    size: 10,
    offset: 0,
    totalPages: 0,
    totalItems: 0,
    unpaged: false,
    sortBy: [],
    path: ''
};
