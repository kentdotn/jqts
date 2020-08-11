import { Value, JSONValue } from '../context';
import { UnexpectedIdError, RuntimeError } from './error';

export function ensureValue(value: Value): JSONValue {
    if ('error' in value) {
        throw value.error;
    }
    if ('id' in value) {
        throw new UnexpectedIdError(value.id);
    }
    return value.value;
}

export function ensureNumberValue(value: Value): number {
    if ('error' in value) {
        throw value.error;
    }
    if ('id' in value) {
        throw new UnexpectedIdError(value.id);
    }
    if (typeof value.value !== 'number') {
        throw new RuntimeError(`unexpected non-number value: ${value.value}`);
    }
    return value.value;
}

export function ensureArray(value: Value): JSONValue[] {
    const values = ensureValue(value);
    if (Array.isArray(values)) return values;
    throw new RuntimeError(`unexpected non-array value: ${values}`);
}

export function ensureObjectKey(value: Value): string {
    if ('error' in value) {
        throw value.error;
    }
    if ('id' in value) {
        return value.id;
    }
    if (typeof value.value === 'string') {
        return value.value;
    }
    throw new RuntimeError(
        `unexpected non-string value for object key: ${value.value}`
    );
}

export function ensureObjectKeyOrArrayIndexable(value: Value): string | number {
    if ('error' in value) {
        throw value.error;
    }
    if ('id' in value) {
        return value.id;
    }
    if (typeof value.value === 'string' || typeof value.value === 'number') {
        return value.value;
    }
    throw new RuntimeError(
        `unexpected non-string value for object key: ${value.value}`
    );
}

export function ensureArrayIndexable(value: Value, size: number): number {
    if ('error' in value) {
        throw value.error;
    }
    if ('id' in value) {
        throw new RuntimeError(
            `unexpected identifier for array index: ${value.id}`
        );
    }
    if (typeof value.value === 'number') {
        return value.value < 0 ? size + value.value : value.value;
    }
    throw new RuntimeError(
        `unexpected non-string value for array index: ${value.value}`
    );
}

export function ensureSlicable(value: Value): string | Array<JSONValue> {
    if ('error' in value) {
        throw value.error;
    }

    if ('value' in value) {
        if (typeof value.value === 'string' || Array.isArray(value.value))
            return value.value;

        throw new RuntimeError(
            `cannot make slice from non-array value: ${value.value}`
        );
    }

    throw new RuntimeError(`cannot make slice from identifier: ${value.id}`);
}
