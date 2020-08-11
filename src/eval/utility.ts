import { JSONValue, JsonMap, isJsonMap } from '../context';

export function expandCombination<T, U>(
    xs: T[],
    initValue: U,
    expand: (prevValue: U, x: T) => U[]
): U[] {
    if (xs.length === 0) return [];

    return xs.reduce(
        (prevValues, x) => {
            return prevValues.reduce(
                (a, prevValue) => [...a, ...expand(prevValue, x)],
                [] as U[]
            );
        },
        [initValue]
    );
}

export function flatten<T>(xs: T[][]): T[] {
    return xs.reduce((acc, x) => [...acc, ...x], []);
}

export function isFalsy(value: JSONValue) {
    return value === undefined || value === null || value === false;
}

export function valueCompare(lhs: JSONValue, rhs: JSONValue): -1 | 0 | 1 {
    if (lhs === null) return rhs === null ? 0 : -1;
    if (rhs === null) return 1;

    if (lhs === false) return rhs === false ? 0 : -1;
    if (rhs === false) return 1;

    if (lhs === true) return rhs === true ? 0 : -1;
    if (rhs === true) return 1;

    if (typeof lhs === 'number') {
        if (typeof rhs === 'number') {
            return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
        }
        return -1;
    }
    if (typeof rhs === 'number') return 1;

    if (typeof lhs === 'string') {
        if (typeof rhs === 'string') {
            return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
        }
        return -1;
    }
    if (typeof rhs === 'string') return 1;

    if (Array.isArray(lhs)) {
        if (Array.isArray(rhs)) return arrayCompare(lhs, rhs);
        return -1;
    }
    if (Array.isArray(rhs)) return 1;

    return objectCompare(lhs, rhs);
}

export function arrayCompare(lhs: JSONValue[], rhs: JSONValue[]): -1 | 0 | 1 {
    for (let i = 0; ; ++i) {
        if (i < lhs.length) {
            if (i < rhs.length) {
                const r = valueCompare(lhs[i], rhs[i]);
                if (r !== 0) return r;
            } else {
                return -1;
            }
        } else {
            if (i < rhs.length) {
                return 1;
            } else {
                return 0;
            }
        }
    }
}

export function objectCompare(lhs: JsonMap, rhs: JsonMap): -1 | 0 | 1 {
    const r = arrayCompare(Object.keys(lhs), Object.keys(rhs));
    if (r !== 0) return r;
    return arrayCompare(Object.values(lhs), Object.values(rhs));
}

function mergeObjects(...xs: Record<string, JSONValue>[]) {
    return xs.reduce((acc, x) => ({ ...acc, ...x }), {});
}

export function mergeObject(
    lhs: Record<string, JSONValue>,
    rhs: Record<string, JSONValue>,
    overwrite: boolean
) {
    if (overwrite) {
        return mergeObjects(lhs, rhs);
    }

    const tmp = { ...lhs };
    Object.keys(rhs).forEach(key => {
        const r = rhs[key];

        if (key in lhs) {
            const l = lhs[key];
            if (isJsonMap(l) && isJsonMap(r)) {
                tmp[key] = mergeObject(l, r, false);
            } else {
                tmp[key] = r;
            }
        } else {
            tmp[key] = r;
        }
    });

    return tmp;
}
