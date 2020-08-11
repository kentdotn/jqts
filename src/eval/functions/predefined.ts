import { JSONValue, isJsonMap, JsonMap } from '../../context';
import { RuntimeError } from '../error';
import { addOperator } from './operators';
import { isFalsy, valueCompare } from '../utility';

export function length(value: JSONValue) {
    if (isJsonMap(value)) {
        return Object.keys(value).length;
    }
    if (Array.isArray(value)) {
        return value.length;
    }
    if (typeof value === 'string') {
        return value.length;
    }
    if (value === null) {
        return 0;
    }
    throw new RuntimeError(`cannot get length of ${value}`);
}

export function utf8bytelength(value: JSONValue) {
    if (typeof value !== 'string') {
        throw new RuntimeError(`cannot get byte length of ${value}`);
    }

    return new TextEncoder().encode(value).length;
}

export function keys(value: JSONValue) {
    if (Array.isArray(value)) {
        return [...value.keys()];
    }
    if (isJsonMap(value)) {
        return Object.keys(value).sort();
    }
    throw new RuntimeError(`cannot get keys from: ${value}`);
}

export function keysUnsorted(value: JSONValue) {
    if (Array.isArray(value)) {
        return [...value.keys()];
    }
    if (isJsonMap(value)) {
        return Object.keys(value);
    }
    throw new RuntimeError(`cannot get keys from: ${value}`);
}

function hasKey(input: JSONValue, key: JSONValue) {
    if (Array.isArray(input)) {
        if (typeof key !== 'number') {
            throw new RuntimeError(`cannot call has(key) with number`);
        }
        return key < input.length;
    }
    if (isJsonMap(input)) {
        if (typeof key !== 'string') {
            throw new RuntimeError(
                `cannot call has(key) with non-string: ${JSON.stringify(key)}`
            );
        }
        return key in input;
    }
    throw new RuntimeError(`cannot call has(key) against ${input}`);
}

export function has(input: JSONValue, key: JSONValue) {
    if (key === undefined) {
        throw new RuntimeError(`missing argment 'key' for has(key)`);
    }
    return hasKey(input, key);
}

export function _in(input: JSONValue, obj: JSONValue) {
    if (obj === undefined) {
        throw new RuntimeError(`missing argment 'obj' for in(obj)`);
    }
    return hasKey(obj, input);
}

export function toEntries(input: JSONValue) {
    if (!isJsonMap(input)) {
        throw new RuntimeError(`cannot call to_entries against ${input}`);
    }
    return Object.keys(input).map(key => {
        const value = input[key];
        return { key, value };
    });
}

export function fromEntries(input: JSONValue) {
    if (!Array.isArray(input)) {
        throw new RuntimeError(`cannot call from_entries against ${input}`);
    }
    return input.reduce((acc: JsonMap, obj) => {
        if (
            isJsonMap(obj) &&
            'key' in obj &&
            typeof obj.key === 'string' &&
            'value' in obj
        ) {
            const { key, value } = obj;
            return { ...acc, [key]: value };
        }
        throw new RuntimeError(`cannot call from_entries against ${input}`);
    }, {});
}

export function isArray(input: JSONValue): input is JSONValue[] {
    return Array.isArray(input);
}

export function isObject(input: JSONValue): input is JsonMap {
    return isJsonMap(input);
}

export function isIterable(input: JSONValue): input is JSONValue[] | JsonMap {
    return isArray(input) || isJsonMap(input);
}

export function isBoolean(input: JSONValue): input is boolean {
    return input === true || input === false;
}

export function isNumber(input: JSONValue): input is number {
    return typeof input === 'number';
}

export function isNormal(input: JSONValue): boolean {
    return (
        typeof input === 'number' &&
        isFinite(input) &&
        !isNaN(input) &&
        input != 0.0
        // TODO: check for subnormals
    );
}

export function isString(input: JSONValue): input is string {
    return typeof input === 'string';
}

export function join(input: JSONValue) {
    if (!isArray(input)) {
        throw new RuntimeError(`cannot add non-array elements: ${input}`);
    }

    if (input.length === 0) return null;

    return input.reduce(
        (acc, v) => (acc ? addOperator(acc, v) : v),
        undefined as JSONValue | undefined
    ) as JSONValue;
}

export function anyOf(input: JSONValue) {
    if (!isArray(input)) {
        throw new RuntimeError(
            `cannot check any against non-array elements: ${input}`
        );
    }

    if (input.length === 0) return false;

    return input.some(v => !isFalsy(v));
}

export function allOf(input: JSONValue) {
    if (!isArray(input)) {
        throw new RuntimeError(
            `cannot check all against non-array elements: ${input}`
        );
    }

    if (input.length === 0) return true;

    return input.every(v => !isFalsy(v));
}

function flattenRecursive(input: JSONValue[], depth?: number): JSONValue[] {
    if (depth === 0) return input;

    return input.reduce(
        (acc: JSONValue[], v) => [
            ...acc,
            ...(isArray(v)
                ? flattenRecursive(v, depth ? depth - 1 : undefined)
                : [v]),
        ],
        []
    );
}

export function flattenArray(input: JSONValue, depth: JSONValue) {
    if (!isArray(input)) {
        throw new RuntimeError(`cannot flatten non-array: ${input}`);
    }
    if (depth !== undefined && typeof depth !== 'number') {
        throw new RuntimeError(
            `cannot call flatten(depth) with non-number depth: ${JSON.stringify(
                depth
            )}`
        );
    }

    return flattenRecursive(input, depth);
}

export function range(
    fromOrUpto: number,
    uptoOrUndef?: number,
    byOrUndef?: number
): number[] {
    const [from, upto] =
        uptoOrUndef === undefined ? [0, fromOrUpto] : [fromOrUpto, uptoOrUndef];
    const by = byOrUndef ?? 1;

    const order = from < upto ? 'asc' : 'desc';
    if (order === 'asc' && by <= 0) return [];
    if (order === 'desc' && by >= 0) return [];

    const values: number[] = [];
    for (let i = from; order === 'asc' ? i < upto : i > upto; i += by) {
        values.push(i);
    }
    return values;
}

export function toNumber(input: JSONValue): number {
    if (typeof input === 'number') {
        return input;
    }
    if (typeof input === 'string') {
        return parseFloat(input);
    }
    throw new RuntimeError(
        `cannot convert to number from non-number/non-string value: ${input}`
    );
}

export function toString(input: JSONValue): string {
    if (typeof input === 'string') {
        return input;
    } else {
        return JSON.stringify(input);
    }
}

export function _type(input: JSONValue): string {
    if (input === null) {
        return 'null';
    } else if (isArray(input)) {
        return 'array';
    } else {
        return typeof input;
    }
}

export function isInfinite(input: JSONValue): boolean {
    return isNumber(input) && !isFinite(input);
}

export function sort(input: JSONValue): JSONValue {
    if (!Array.isArray(input)) {
        throw new Error(`cannot sort non-array value: ${input}`);
    }
    return input.sort(valueCompare);
}
