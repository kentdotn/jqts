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
            ctx.values.map(v => this.value.evaluate(ctx.withTarget(v)).values)
        ).map(ensureValue);

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
            const fields = this.fields.map(f => f.evaluate(ctx));

            const xs = expandCombination(fields, {} as JsonMap, (prev, vs) => {
                return vs.map(v => {
                    return { ...prev, ...v };
                });
            });

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

export class KeyEvaluator implements Evaluator<ContextWithTarget, Context> {
    constructor(private key: Evaluator<Context>) {}

    evaluate(ctx: ContextWithTarget): Context {
        const target = ctx.target;

        const record = ensureValue(target);
        if (!isJsonMap(record) && !Array.isArray(record)) {
            throw new RuntimeError(
                `cannot index non-object/non-array value: ${typeof record}`
            );
        }

        const keys = this.key.evaluate(ctx).values;
        const output = keys.map(key => {
            const index = ensureObjectKeyOrArrayIndexable(key);
            if (typeof index === 'string') {
                if (!isJsonMap(record)) {
                    throw new RuntimeError(
                        `cannot index non-object value with string: ${typeof record}`
                    );
                }
                return { value: record[index] ?? null };
            } else {
                if (!Array.isArray(record)) {
                    throw new RuntimeError(
                        `cannot index non-array value with number: ${typeof record}`
                    );
                }
                const value =
                    index >= 0 ? record[index] : record[record.length + index];
                return {
                    value: value ?? null,
                };
            }
        });
        return new Context(...output);
    }

    dump() {
        return [this.key?.dump()];
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
        const lhs = this.lhs.evaluate(ctx).values.map(ensureValue);
        const rhs = this.rhs.evaluate(ctx).values.map(ensureValue);

        const pairs = expandCombination(
            [lhs, rhs],
            [] as JSONValue[],
            (prev, xs) => {
                return xs.map(x => [...prev, x]);
            }
        );

        return new Context(
            ...pairs.map(([lhs, rhs]) => {
                try {
                    const value = evaluateBinaryOperator(this.op, lhs, rhs);
                    return { value };
                } catch (error) {
                    return { error };
                }
            })
        );
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
        return this.evaluators.reduce(
            (ctx: Context, x) => x.evaluate(ctx),
            ctx
        );
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
