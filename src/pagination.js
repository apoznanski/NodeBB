"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring_1 = __importDefault(require("querystring"));
const lodash_1 = __importDefault(require("lodash"));
function createPagination(currentPage, pageCount, queryObj) {
    if (pageCount <= 1) {
        return {
            prev: { page: 1, active: currentPage > 1 },
            next: { page: 1, active: currentPage < pageCount },
            first: { page: 1, active: currentPage === 1 },
            last: { page: 1, active: currentPage === pageCount },
            rel: [],
            pages: [],
            currentPage: 1,
            pageCount: 1,
        };
    }
    let pagesToShow = [1, 2, pageCount - 1, pageCount];
    currentPage = currentPage || 1;
    const previous = Math.max(1, currentPage - 1);
    const next = Math.min(pageCount, currentPage + 1);
    let startPage = Math.max(1, currentPage - 2);
    if (startPage > pageCount - 5) {
        startPage -= 2 - (pageCount - currentPage);
    }
    let i;
    for (i = 0; i < 5; i += 1) {
        pagesToShow.push(startPage + i);
    }
    pagesToShow = lodash_1.default.uniq(pagesToShow).filter(page => page > 0 && page <= pageCount).sort((a, b) => a - b);
    const pages = pagesToShow.map((page) => {
        queryObj.page = page;
        return { page: page, active: page === currentPage, qs: querystring_1.default.stringify(queryObj), separator: false };
    });
    for (i = pages.length - 1; i > 0; i -= 1) {
        if (pages[i].page - 2 === pages[i - 1].page) {
            pages.splice(i, 0, {
                page: pages[i].page - 1,
                active: false,
                qs: querystring_1.default.stringify(queryObj),
                separator: false,
            });
        }
        else if (pages[i].page - 1 !== pages[i - 1].page) {
            pages.splice(i, 0, { page: pages[i].page - 1, active: false, qs: querystring_1.default.stringify(queryObj), separator: true });
        }
    }
    const data = {
        rel: [],
        pages: pages,
        currentPage: currentPage,
        pageCount: pageCount,
        prev: { page: 1, active: currentPage > 1, qs: '' },
        next: { page: 1, active: currentPage < pageCount, qs: '' },
        first: { page: 1, active: currentPage === 1, qs: '' },
        last: { page: 1, active: currentPage === pageCount, qs: '' },
    };
    queryObj.page = previous;
    data.prev = { page: previous, active: currentPage > 1, qs: querystring_1.default.stringify(queryObj) };
    queryObj.page = next;
    data.next = { page: next, active: currentPage < pageCount, qs: querystring_1.default.stringify(queryObj) };
    queryObj.page = 1;
    data.first = { page: 1, active: currentPage === 1, qs: querystring_1.default.stringify(queryObj) };
    queryObj.page = pageCount;
    data.last = { page: pageCount, active: currentPage === pageCount, qs: querystring_1.default.stringify(queryObj) };
    if (currentPage < pageCount) {
        data.rel.push({
            rel: 'next',
            href: `?${querystring_1.default.stringify(Object.assign(Object.assign({}, queryObj), { page: next }))}`,
        });
    }
    if (currentPage > 1) {
        data.rel.push({
            rel: 'prev',
            href: `?${querystring_1.default.stringify(Object.assign(Object.assign({}, queryObj), { page: previous }))}`,
        });
    }
    return data;
}
exports.default = createPagination;
