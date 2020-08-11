import { Context, JSONValue, Value } from '../../context';
import {
    Evaluator,
    ArrayEvaluator,
    PipedEvaluator,
    IndexedEvaluator,
    IdentityEvaluator,
    SpreadEvaluator,
} from '..';
import { ensureValue, ensureNumberValue, ensureArray } from '../ensure';
import { RuntimeError } from '../error';
import { expandCombination, flatten, isFalsy, valueCompare } from '../utility';
import {
    length,
    utf8bytelength,
    keys,
    keysUnsorted,
    has,
    _in,
    toEntries,
    fromEntries,
    isArray,
    isObject,
    isIterable,
    join,
    anyOf,
    allOf,
    flattenArray,
    isBoolean,
    isNumber,
    isNormal,
    isString,
    toNumber,
    toString,
    _type,
    isInfinite,
    sort,
    range,
    minIndex,
    maxIndex,
    groupBy,
    sortBy,
    unique,
    uniqueBy,
    reverse,
    contains,
    indices,
    index,
    rindex,
    startswith,
    endswith,
    combinations,
} from './predefined';

function invokeFunction(
    input: Value,
    args: Value[],
    fn: (input: JSONValue, ...args: JSONValue[]) => JSONValue | undefined
) {
    try {
        const value = fn(ensureValue(input), ...args.map(ensureValue));
        if (value === undefined) return undefined;
        return { value };
    } catch (error) {
        return { error };
    }
}

function forEachArgs(args: Context[], fn: (args: Value[]) => Value[]) {
    const combinations = expandCombination(
        args.map(arg => arg.values),
        [] as Value[],
        (prev, xs) => xs.map(x => [...prev, x])
    );
    return (combinations.length === 0 ? [[]] : combinations)
        .map(args => fn(args))
        .reduce((acc, x) => [...acc, ...x], [] as Value[]);
}

function forEachInvocation(
    ctx: Context,
    args: Evaluator<Context>[],
    fn: (input: Value, args: Value[]) => Value[]
) {
    return new Context(
        ...flatten(
            ctx.values.map(input =>
                // so... if we know all args are independent on context,
                // we can evaluate args only once...
                forEachArgs(
                    args.map(arg => arg.evaluate(new Context(input))),
                    args => fn(input, args)
                )
            )
        )
    );
}

export function standardFunction(
    fn: (input: JSONValue, ...args: JSONValue[]) => JSONValue
) {
    return (ctx: Context, args: Evaluator<Context>[]) => {
        return forEachInvocation(ctx, args, (input, args) => {
            const result = invokeFunction(input, args, fn);
            return result === undefined ? [] : [result];
        });
    };
}

function standardNumericFunction(
    name: string,
    fn: (input: number, ...args: JSONValue[]) => JSONValue
) {
    return standardFunction((input, ...args) => {
        if (!isNumber(input)) {
            throw new RuntimeError(
                `cannot apply function ${name} against non-number: ${JSON.stringify(
                    input
                )}`
            );
        }

        return fn(input, ...args);
    });
}

class StandardFunctionEvaluator implements Evaluator<Context> {
    constructor(
        private fun: (input: JSONValue, ...args: JSONValue[]) => JSONValue,
        private args: Evaluator<Context>[] = []
    ) {}

    evaluate(ctx: Context): Context {
        return forEachInvocation(ctx, this.args, (input, args) => {
            const result = invokeFunction(input, args, this.fun);
            return result === undefined ? [] : [result];
        });
    }

    dump() {
        return { stdfunc: this.fun };
    }
}

function selectFunction(
    fn: (input: JSONValue, ...args: JSONValue[]) => boolean
) {
    return (ctx: Context, args: Evaluator<Context>[]) => {
        return forEachInvocation(ctx, args, (input, args) => {
            const result: Value | undefined = invokeFunction(input, args, fn);
            if (result === undefined) return [];
            if ('value' in result) {
                return isFalsy(result.value) ? [] : [input];
            } else {
                return [result];
            }
        });
    };
}

function standardArrayFunction<T extends JSONValue>(
    fn: (input: JSONValue[], ...args: JSONValue[]) => T
) {
    return standardFunction((input, ...args) => {
        if (!Array.isArray(input)) {
            throw new RuntimeError(
                `unexpected non-array input: ${JSON.stringify(input)}`
            );
        }

        return fn(input, ...args);
    });
}

function arrayFunctionWithKeyEvaluation<T extends JSONValue>(
    fn: (values: JSONValue[], keys: JSONValue[]) => T
) {
    return (ctx: Context, args: Evaluator<Context>[]) => {
        const compareBy = args[0];
        const values = ctx.values.map(input => {
            const values = ensureArray(input);
            const keys = values.map(value => {
                return ensureValue(
                    compareBy.evaluate(new Context({ value })).values[0]
                );
            });
            const value = fn(values, keys);
            return { value };
        });
        return new Context(...values);
    };
}

export const functions = new Map<
    string,
    (ctx: Context, args: Evaluator<Context>[]) => Context
>([
    ['length', standardFunction(length)],
    ['utf8bytelength', standardFunction(utf8bytelength)],
    ['keys', standardFunction(keys)],
    ['keys_unsorted', standardFunction(keysUnsorted)],
    ['has', standardFunction(has)],
    ['in', standardFunction(_in)],
    [
        'map',
        (ctx, [arg]) => {
            if (!arg) {
                return new Context({
                    error: new RuntimeError(`missing argment for map`),
                });
            }

            return new ArrayEvaluator([
                new PipedEvaluator([
                    new IndexedEvaluator(
                        new IdentityEvaluator(),
                        new SpreadEvaluator()
                    ),
                    arg,
                ]),
            ]).evaluate(ctx);
        },
    ],
    ['to_entries', standardFunction(toEntries)],
    ['from_entries', standardFunction(fromEntries)],
    [
        'with_entries',
        (ctx, args) =>
            new PipedEvaluator([
                new StandardFunctionEvaluator(toEntries),
                new IndexedEvaluator(
                    new IdentityEvaluator(),
                    new SpreadEvaluator()
                ),
                ...args,
                new StandardFunctionEvaluator(fromEntries),
            ]).evaluate(ctx),
    ],
    ['select', selectFunction((_, pred) => !isFalsy(pred))],
    ['arrays', selectFunction(isArray)],
    ['objects', selectFunction(isObject)],
    ['iterables', selectFunction(isIterable)],
    ['booleans', selectFunction(isBoolean)],
    ['numbers', selectFunction(isNumber)],
    ['normals', selectFunction(isNormal)],
    ['finites', selectFunction(input => isNumber(input) && isFinite(input))],
    ['strings', selectFunction(isString)],
    ['nulls', selectFunction(input => input === null)],
    ['values', selectFunction(input => input !== null)],
    ['scalars', selectFunction(input => !isIterable(input))],
    ['empty', selectFunction(() => false)],
    [
        'error',
        standardFunction((_, message) => {
            if (message === undefined) {
                throw new RuntimeError(`missing argment for map`);
            }
            if (typeof message !== 'string') {
                throw new RuntimeError(
                    `error message is not a string: ${message}`
                );
            }
            throw new RuntimeError(message);
        }),
    ],
    ['add', standardFunction(join)],
    ['any', standardFunction(anyOf)],
    ['all', standardFunction(allOf)],
    ['flatten', standardFunction(flattenArray)],
    [
        'range',
        (input, args) =>
            forEachInvocation(input, args, (_, args) => {
                const [fromOrUpto, uptoOrUndef, byOrUndef] = args.map(
                    ensureNumberValue
                );
                const [from, upto] =
                    uptoOrUndef === undefined
                        ? [0, fromOrUpto]
                        : [fromOrUpto, uptoOrUndef];
                const by = byOrUndef ?? 1;

                return range(from, upto, by).map(value => ({ value }));
            }),
    ],
    ['floor', standardNumericFunction('floor', Math.floor)],
    ['sqrt', standardNumericFunction('sqrt', Math.sqrt)],
    ['tonumber', standardFunction(toNumber)],
    ['tostring', standardFunction(toString)],
    ['type', standardFunction(_type)],
    ['infinite', standardFunction(() => Infinity)],
    ['nan', standardFunction(() => NaN)],
    ['isinfinite', standardFunction(isInfinite)],
    ['isnan', standardFunction(input => isNumber(input) && isNaN(input))],
    ['isfinite', standardFunction(input => isNumber(input) && isFinite(input))],
    ['isnormal', standardFunction(isNormal)],
    ['sort', standardArrayFunction(sort)],
    ['sort_by', arrayFunctionWithKeyEvaluation(sortBy)],
    ['group_by', arrayFunctionWithKeyEvaluation(groupBy)],
    ['min', standardArrayFunction(input => input[minIndex(input)])],
    [
        'min_by',
        arrayFunctionWithKeyEvaluation(
            (values, keys) => values[minIndex(keys)]
        ),
    ],
    ['max', standardArrayFunction(input => input[maxIndex(input)])],
    [
        'max_by',
        arrayFunctionWithKeyEvaluation(
            (values, keys) => values[maxIndex(keys)]
        ),
    ],
    ['unique', standardArrayFunction(unique)],
    ['unique_by', arrayFunctionWithKeyEvaluation(uniqueBy)],
    ['reverse', standardArrayFunction(reverse)],
    ['contains', standardFunction(contains)],
    ['indices', standardFunction(indices)],
    ['index', standardFunction(index)],
    ['rindex', standardFunction(rindex)],
    ['inside', standardFunction((input, target) => contains(target, input))],
    ['startswith', standardFunction(startswith)],
    ['endswith', standardFunction(endswith)],
    [
        'combinations',
        (ctx, args) =>
            forEachInvocation(ctx, args, (input, args) => {
                combinations;
                const [nOrUndef] = args.map(ensureNumberValue);
                const values = combinations(ensureArray(input), nOrUndef);
                return values.map(value => ({ value }));
            }),
    ],
]);
