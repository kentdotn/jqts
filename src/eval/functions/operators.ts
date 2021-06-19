import { JSONValue, isJsonMap } from '../../context';
import { mergeObject, isFalsy, isNullish } from '../utility';
import { RuntimeError } from '../error';

export function multiplyOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs * rhs;
    } else if (typeof lhs == 'string' && typeof rhs == 'number') {
        if (rhs == 0) return null;
        return [...Array(rhs)].map(() => lhs).join();
    } else if (typeof rhs == 'string' && typeof lhs == 'number') {
        if (lhs == 0) return null;
        return [...Array(lhs)].map(() => rhs).join();
    } else if (isJsonMap(lhs) && isJsonMap(rhs)) {
        return mergeObject(lhs, rhs, false);
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function divideOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        if (rhs === 0) {
            throw new RuntimeError(`divison by zero`);
        }
        return lhs / rhs;
    } else if (typeof lhs == 'string' && typeof rhs == 'string') {
        return lhs.split(rhs);
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function moduloOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs % rhs;
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function addOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (lhs === null) {
        return rhs;
    } else if (rhs === null) {
        return lhs;
    } else if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs + rhs;
    } else if (typeof lhs == 'string' && typeof rhs == 'string') {
        return lhs + rhs;
    } else if (Array.isArray(lhs) && Array.isArray(rhs)) {
        return [...lhs, ...rhs];
    } else if (isJsonMap(lhs) && isJsonMap(rhs)) {
        return mergeObject(lhs, rhs, true);
    }

    throw new RuntimeError(
        `cannot apply binary operator '+' with ${JSON.stringify(
            lhs
        )} and ${JSON.stringify(rhs)}`
    );
}

export function minusOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (lhs === null) {
        return rhs;
    } else if (rhs === null) {
        return lhs;
    } else if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs - rhs;
    } else if (Array.isArray(lhs) && Array.isArray(rhs)) {
        return lhs.filter(e => !rhs.includes(e));
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function andOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    return !isFalsy(lhs) && !isFalsy(rhs);
}

export function orOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    return !isFalsy(lhs) || !isFalsy(rhs);
}

export function alternativeOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    return !isNullish(lhs) ? lhs : rhs;
}

export function greaterThanOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs > rhs;
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function greaterThanOrEqualToOperator(
    lhs: JSONValue,
    rhs: JSONValue
): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs >= rhs;
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function lessThanOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs < rhs;
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function lessThanOrEqualToOperator(
    lhs: JSONValue,
    rhs: JSONValue
): JSONValue {
    if (typeof lhs == 'number' && typeof rhs == 'number') {
        return lhs <= rhs;
    }

    throw new RuntimeError(
        `cannot apply binary operator '*' with ${typeof lhs} and ${typeof rhs}`
    );
}

export function notEqualOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    return JSON.stringify(lhs) != JSON.stringify(rhs);
}

export function equalOperator(lhs: JSONValue, rhs: JSONValue): JSONValue {
    return JSON.stringify(lhs) == JSON.stringify(rhs);
}
