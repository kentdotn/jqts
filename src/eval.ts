import {
    Context,
    JSONValue,
    Value,
    ContextWithTarget,
    JsonMap,
    isJsonMap,
} from './context';

export class RuntimeError extends Error {}

export interface Evaluator<Ctx, Ret = Ctx> {
    evaluate(ctx: Ctx): Ret;
    dump(): unknown;
}

export class PrimitiveEvaluator implements Evaluator<Context> {
    constructor(private value: number | boolean | string | null) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    evaluate(ctx: Context) {
        return new Context({ value: this.value });
    }

    dump() {
        return this.value;
    }
}

export class IdEvaluator implements Evaluator<Context> {
    constructor(private name: string) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    evaluate(ctx: Context) {
        return new Context({ id: this.name });
    }

    dump() {
        return { id: this.name };
    }
}

export class IdentityEvaluator implements Evaluator<Context> {
    evaluate(ctx: Context) {
        return ctx;
    }

    dump() {
        return { identity: 0 };
    }
}

function expandCombination<T, U>(
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

class UnexpectedIdError extends RuntimeError {
    constructor(id: string) {
        super(`unexpected identifier: ${id}`);
    }
}

function ensureValue(value: Value): JSONValue {
    if ('error' in value) {
        throw value.error;
    }
    if ('id' in value) {
        throw new UnexpectedIdError(value.id);
    }
    return value.value;
}

function ensureNumberValue(value: Value): number {
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

function ensureObjectKey(value: Value): string {
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

function ensureObjectKeyOrArrayIndexable(value: Value): string | number {
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

function ensureArrayIndexable(value: Value, size: number): number {
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

function ensureSlicable(value: Value): string | Array<JSONValue> {
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

function flatten<T>(xs: T[][]): T[] {
    return xs.reduce((acc, x) => [...acc, ...x], []);
}

export class ArrayEvaluator implements Evaluator<Context> {
    constructor(private elements: Evaluator<Context>[]) {}

    evaluate(ctx: Context) {
        try {
            const xs = this.elements.map(x => x.evaluate(ctx).values);
            return new Context({
                value: flatten(xs).map(ensureValue),
            });
        } catch (error) {
            return new Context({ error });
        }
    }

    dump() {
        return {
            array: this.elements.map(x => x.dump()),
        };
    }
}

function mergeObjects(...xs: Record<string, JSONValue>[]) {
    return xs.reduce((acc, x) => ({ ...acc, ...x }), {});
}

export class ObjectFieldEvaluator implements Evaluator<Context, JsonMap[]> {
    constructor(
        private key: Evaluator<Context>,
        private value: Evaluator<Context>
    ) {}

    evaluate(ctx: Context) {
        const keys = this.key.evaluate(ctx).values.map(ensureObjectKey);
        const values = flatten(
            ctx.values.map(
                v => this.value.evaluate(new Context(v).withTarget(v)).values
            )
        ).map(v => {
            try {
                return ensureValue(v);
            } catch {
                return ensureObjectKey(v);
            }
        });

        const pairs = expandCombination(
            [keys, values],
            [] as (string | JSONValue)[],
            (prev, xs) => {
                return xs.map(x => [...prev, x]);
            }
        ) as [string, JSONValue][];

        return pairs.map(([key, value]) => ({ [key]: value }));
    }

    dump() {
        return {
            key: this.key.dump(),
            value: this.value?.dump(),
        };
    }
}

export class ObjectEvaluator implements Evaluator<Context> {
    constructor(private fields: ObjectFieldEvaluator[]) {}

    evaluate(ctx: Context) {
        try {
            const xs = flatten(
                ctx.values.map(v => {
                    const ctx0 = new Context(v);
                    return expandCombination(
                        this.fields.map(f => f.evaluate(ctx0)),
                        {} as JsonMap,
                        (prev, vs) => {
                            return vs.map(v => {
                                return { ...prev, ...v };
                            });
                        }
                    );
                })
            );

            return new Context(...xs.map(value => ({ value })));
        } catch (error) {
            return new Context({ error });
        }
    }

    dump() {
        return {
            object: this.fields.map(x => x.dump()),
        };
    }
}

function indexedByKey(key: string | number, value: JSONValue): JSONValue {
    if (isJsonMap(value)) {
        if (typeof key === 'string') {
            return value[key] ?? null;
        }
        throw new RuntimeError(
            `cannot index non-object value with string: ${typeof value}`
        );
    }

    if (Array.isArray(value)) {
        if (typeof key === 'number') {
            const index = key >= 0 ? key : value.length + key;
            return value[index] ?? null;
        }
        throw new RuntimeError(
            `cannot index non-array value with number: ${typeof value}`
        );
    }

    throw new RuntimeError(
        `cannot index non-object/non-array value: ${JSON.stringify(value)}`
    );
}

export class KeyEvaluator implements Evaluator<ContextWithTarget, Context> {
    constructor(public key: Evaluator<Context>) {}

    evaluate(ctx: ContextWithTarget): Context {
        try {
            const indexedValues = this.key
                .evaluate(ctx)
                .values.map(key =>
                    indexedByKey(
                        ensureObjectKeyOrArrayIndexable(key),
                        ensureValue(ctx.target)
                    )
                );
            return new Context(...indexedValues.map(value => ({ value })));
        } catch (error) {
            return new Context({ error });
        }
    }

    dump() {
        return { key: this.key };
    }
}

export class SliceEvaluator implements Evaluator<ContextWithTarget, Context> {
    constructor(
        private first: Evaluator<Context> | null,
        private last: Evaluator<Context> | null
    ) {}

    evaluate(ctx: ContextWithTarget) {
        const sliceable = ensureSlicable(ctx.target);

        const start = this.first
            ?.evaluate(ctx)
            .values.map(v => ensureArrayIndexable(v, sliceable.length)) ?? [0];
        const end = this.last
            ?.evaluate(ctx)
            .values.map(v => ensureArrayIndexable(v, sliceable.length)) ?? [
            sliceable.length,
        ];

        const pairs = expandCombination(
            [start, end],
            [] as number[],
            (prev, xs) => {
                return xs.map(x => [...prev, x]);
            }
        ) as [number, number][];

        return new Context(
            ...pairs
                .map(([first, last]) => sliceable.slice(first, last))
                .map(value => ({ value }))
        );
    }

    dump() {
        if (this.first) {
            if (this.last) {
                return [this.first.dump(), this.last.dump()];
            } else {
                return [this.first.dump(), 'last'];
            }
        } else {
            if (this.last) {
                return ['start', this.last.dump()];
            }
        }
    }
}

export class SpreadEvaluator implements Evaluator<ContextWithTarget, Context> {
    evaluate(ctx: ContextWithTarget): Context {
        const target = ensureValue(ctx.target);

        if (isJsonMap(target)) {
            return new Context(
                ...Object.keys(target)
                    .map(k => target[k])
                    .map(v => ({ value: v }))
            );
        } else if (Array.isArray(target)) {
            return new Context(...target.map(v => ({ value: v })));
        } else {
            throw new RuntimeError(
                `cannot iterate over non-object/non-array value: ${target}`
            );
        }
    }

    dump() {
        return { spread: 0 };
    }
}

export class IndexedEvaluator implements Evaluator<Context> {
    constructor(
        public target: Evaluator<Context>,
        public indexer: Evaluator<Context>
    ) {}

    evaluate(ctx: Context): Context {
        try {
            const targets = this.target.evaluate(ctx).values;

            const results = targets.map(target => {
                return this.indexer.evaluate(ctx.withTarget(target));
            });

            return new Context(...flatten(results.map(c => c.values)));
        } catch (error) {
            return new Context({ error });
        }
    }

    dump() {
        return {
            indexing: this.target.dump(),
            indexer: this.indexer.dump(),
        };
    }
}

function length(value: JSONValue) {
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

function utf8bytelength(value: JSONValue) {
    if (typeof value !== 'string') {
        throw new RuntimeError(`cannot get byte length of ${value}`);
    }

    return new TextEncoder().encode(value).length;
}

function keys(value: JSONValue) {
    if (Array.isArray(value)) {
        return [...value.keys()];
    }
    if (isJsonMap(value)) {
        return Object.keys(value).sort();
    }
    throw new RuntimeError(`cannot get keys from: ${value}`);
}

function keysUnsorted(value: JSONValue) {
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

function toEntries(input: JSONValue) {
    if (!isJsonMap(input)) {
        throw new RuntimeError(`cannot call to_entries against ${input}`);
    }
    return Object.keys(input).map(key => {
        const value = input[key];
        return { key, value };
    });
}

function fromEntries(input: JSONValue) {
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

function isArray(input: JSONValue): input is JSONValue[] {
    return Array.isArray(input);
}

function isObject(input: JSONValue): input is JsonMap {
    return isJsonMap(input);
}

function isIterable(input: JSONValue): input is JSONValue[] | JsonMap {
    return isArray(input) || isJsonMap(input);
}

function join(input: JSONValue) {
    if (!isArray(input)) {
        throw new RuntimeError(`cannot add non-array elements: ${input}`);
    }

    if (input.length === 0) return null;

    return input.reduce((acc: JSONValue | undefined, v) => {
        if (acc === undefined) {
            return v;
        } else {
            return evaluateBinaryOperator('+', acc, v);
        }
    }, undefined) as JSONValue;
}

function anyOf(input: JSONValue) {
    if (!isArray(input)) {
        throw new RuntimeError(
            `cannot check any against non-array elements: ${input}`
        );
    }

    if (input.length === 0) return false;

    return input.some(v => !isFalsy(v));
}

function allOf(input: JSONValue) {
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

function flattenArray(input: JSONValue, [depth]: JSONValue[]) {
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

function invokeFunction(
    input: Value,
    args: Value[],
    fn: (input: JSONValue, args: JSONValue[]) => JSONValue | undefined
) {
    try {
        const value = fn(ensureValue(input), args.map(ensureValue));
        if (value === undefined) return undefined;
        return { value };
    } catch (error) {
        return { error };
    }
}

function standardFunction(
    fn: (input: JSONValue, args: JSONValue[]) => JSONValue
) {
    return (ctx: Context, args: Evaluator<Context>[]) => {
        return forEachInvocation(ctx, args, (input, args) => {
            const result = invokeFunction(input, args, fn);
            return result === undefined ? [] : [result];
        });
    };
}

class StandardFunctionEvaluator implements Evaluator<Context> {
    constructor(
        private fun: (input: JSONValue, args: JSONValue[]) => JSONValue,
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

function selectFunction(fn: (input: JSONValue, args: JSONValue[]) => boolean) {
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

const functions = new Map<
    string,
    (ctx: Context, args: Evaluator<Context>[]) => Context
>([
    ['length', standardFunction(length)],
    ['utf8bytelength', standardFunction(utf8bytelength)],
    ['keys', standardFunction(keys)],
    ['keys_unsorted', standardFunction(keysUnsorted)],
    [
        'has',
        standardFunction((input, [key]) => {
            if (key === undefined) {
                throw new RuntimeError(`missing argment 'key' for has(key)`);
            }
            return hasKey(input, key);
        }),
    ],
    [
        'in',
        standardFunction((input, [obj]) => {
            if (obj === undefined) {
                throw new RuntimeError(`missing argment 'obj' for in(obj)`);
            }
            return hasKey(obj, input);
        }),
    ],
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
    [
        'select',
        (ctx, args) =>
            forEachInvocation(ctx, args, (input, [pred]) => {
                if (!pred) {
                    return [
                        {
                            error: new RuntimeError(`missing argment for map`),
                        },
                    ];
                }

                return isFalsy(ensureValue(pred)) ? [] : [input];
            }),
    ],
    ['arrays', selectFunction(isArray)],
    ['objects', selectFunction(isObject)],
    ['iterables', selectFunction(isIterable)],
    [
        'booleans',
        selectFunction(input => {
            return input === true || input === false;
        }),
    ],
    [
        'numbers',
        selectFunction(input => {
            return typeof input === 'number';
        }),
    ],
    [
        'normals',
        selectFunction(input => {
            return (
                typeof input === 'number' &&
                isFinite(input) &&
                !isNaN(input) &&
                input != 0.0
                // TODO: check for subnormals
            );
        }),
    ],
    [
        'finites',
        selectFunction(input => {
            return typeof input === 'number' && isFinite(input);
        }),
    ],
    [
        'strings',
        selectFunction(input => {
            return typeof input === 'string';
        }),
    ],
    ['nulls', selectFunction(input => input === null)],
    ['values', selectFunction(input => input !== null)],
    ['scalars', selectFunction(input => !isIterable(input))],
    ['empty', selectFunction(() => false)],
    [
        'error',
        standardFunction((_, [message]) => {
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

                const order = from < upto ? 'asc' : 'desc';
                if (order === 'asc' && by <= 0) return [];
                if (order === 'desc' && by >= 0) return [];

                const values: JSONValue[] = [];
                for (
                    let i = from;
                    order === 'asc' ? i < upto : i > upto;
                    i += by
                ) {
                    values.push(i);
                }
                return values.map(value => ({ value }));
            }),
    ],
    [
        'floor',
        standardFunction(input => {
            if (typeof input !== 'number') {
                throw new RuntimeError(
                    `cannot apply floor against non-number: ${input}`
                );
            }
            return Math.floor(input);
        }),
    ],
    [
        'sqrt',
        standardFunction(input => {
            if (typeof input !== 'number') {
                throw new RuntimeError(
                    `cannot apply sqrt against non-number: ${input}`
                );
            }
            return Math.sqrt(input);
        }),
    ],
    [
        'tonumber',
        standardFunction(input => {
            if (typeof input === 'number') {
                return input;
            }
            if (typeof input === 'string') {
                return parseFloat(input);
            }
            throw new RuntimeError(
                `cannot convert to number from non-number/non-string value: ${input}`
            );
        }),
    ],
    [
        'tostring',
        standardFunction(input => {
            if (typeof input === 'string') {
                return input;
            } else {
                return JSON.stringify(input);
            }
        }),
    ],
    [
        'type',
        standardFunction(input => {
            if (input === null) {
                return 'null';
            } else if (isArray(input)) {
                return 'array';
            } else {
                return typeof input;
            }
        }),
    ],
]);

export class FunctionCallEvaluator implements Evaluator<Context> {
    constructor(private funcname: string, private args: Evaluator<Context>[]) {}

    evaluate(ctx: Context): Context {
        const func = functions.get(this.funcname);
        if (func === undefined) {
            return new Context({
                error: new RuntimeError(`unknown function '${this.funcname}'`),
            });
        }

        return func(ctx, this.args);
    }

    dump() {
        return { call: { [this.funcname]: this.args.map(e => e.dump()) } };
    }
}

function mergeObject(
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

function isFalsy(value: JSONValue) {
    return value === undefined || value === null || value === false;
}

function evaluateBinaryOperator(op: string, lhs: JSONValue, rhs: JSONValue) {
    switch (op) {
        case '*':
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
            break;

        case '/':
            if (typeof lhs == 'number' && typeof rhs == 'number') {
                if (rhs === 0) {
                    throw new RuntimeError(`divison by zero`);
                }
                return lhs / rhs;
            } else if (typeof lhs == 'string' && typeof rhs == 'string') {
                return lhs.split(rhs);
            }
            break;

        case '%':
            if (typeof lhs == 'number' && typeof rhs == 'number') {
                return lhs % rhs;
            }
            break;

        case '+':
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
            break;

        case '-':
            if (lhs === null) {
                return rhs;
            } else if (rhs === null) {
                return lhs;
            } else if (typeof lhs == 'number' && typeof rhs == 'number') {
                return lhs - rhs;
            } else if (Array.isArray(lhs) && Array.isArray(rhs)) {
                return lhs.filter(e => !rhs.includes(e));
            }
            break;

        case 'and':
            return !isFalsy(lhs) && !isFalsy(rhs);

        case 'or':
            return !isFalsy(lhs) || !isFalsy(rhs);

        case '>':
            if (typeof lhs == 'number' && typeof rhs == 'number') {
                return lhs > rhs;
            }
        case '>=':
            if (typeof lhs == 'number' && typeof rhs == 'number') {
                return lhs >= rhs;
            }
        case '<':
            if (typeof lhs == 'number' && typeof rhs == 'number') {
                return lhs < rhs;
            }
        case '<=':
            if (typeof lhs == 'number' && typeof rhs == 'number') {
                return lhs <= rhs;
            }

        case '!=':
            return JSON.stringify(lhs) != JSON.stringify(rhs);

        case '==':
            return JSON.stringify(lhs) == JSON.stringify(rhs);
    }

    throw new RuntimeError(
        `cannot apply binary operator '${op}' with ${typeof lhs} and ${typeof rhs}`
    );
}

export class BinaryOperatorEvaluator implements Evaluator<Context> {
    constructor(
        private op: string,
        private lhs: Evaluator<Context>,
        private rhs: Evaluator<Context>
    ) {}

    evaluate(ctx: Context) {
        return forEachInvocation(ctx, [this.lhs, this.rhs], (input, args) => {
            const result = invokeFunction(input, args, (_, [lhs, rhs]) =>
                evaluateBinaryOperator(this.op, lhs, rhs)
            );
            return result === undefined ? [] : [result];
        });
    }

    dump() {
        return {
            [this.op]: [this.lhs?.dump(), this.rhs?.dump()],
        };
    }
}

export class ParallelEvaluator implements Evaluator<Context> {
    constructor(private evaluators: Evaluator<Context>[]) {}

    evaluate(ctx: Context) {
        return new Context(
            ...this.evaluators.reduce((acc: Value[], x) => {
                return [...acc, ...x.evaluate(ctx).values];
            }, [])
        );
    }

    dump() {
        return { parallel: this.evaluators.map(e => e.dump()) };
    }
}

export class PipedEvaluator implements Evaluator<Context> {
    constructor(private evaluators: Evaluator<Context>[]) {}

    evaluate(ctx: Context) {
        return this.evaluators.reduce((ctx, x) => x.evaluate(ctx), ctx);
    }

    dump() {
        return { piped: this.evaluators.map(e => e.dump()) };
    }
}

export class TryCatchEvaluator implements Evaluator<Context> {
    constructor(private evaluator: Evaluator<Context>) {}

    evaluate(ctx: Context) {
        return new Context(
            ...this.evaluator.evaluate(ctx).values.filter(v => !('error' in v))
        );
    }

    dump() {
        return { trycatch: this.evaluator };
    }
}

export function evaluate(evaluator: Evaluator<Context>, json: JSONValue) {
    const result = evaluator.evaluate(new Context({ value: json }));
    return result.values.map(v => {
        if ('id' in v) {
            return v;
        } else if ('error' in v) {
            throw v.error;
        } else {
            return v.value;
        }
    });
}
