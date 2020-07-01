import {
    Context,
    JSONValue,
    Value,
    ContextWithTarget,
    JsonMap,
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

export class ArrayEvaluator implements Evaluator<Context> {
    constructor(private elements: Evaluator<Context>[]) {}

    evaluate(ctx: Context) {
        const xs = this.elements.map(x => x.evaluate(ctx).values);
        return new Context({
            value: flatten(xs).map(v => {
                if ('id' in v)
                    throw new RuntimeError(
                        `unexpected identifier in array: ${v.id}`
                    );
                return v.value;
            }),
        });
    }

    dump() {
        return {
            array: this.elements.map(x => x.dump()),
        };
    }
}

function flatten<T>(xs: T[][]): T[] {
    return xs.reduce((acc, x) => [...acc, ...x], []);
}

export class ObjectFieldEvaluator implements Evaluator<Context, JsonMap[]> {
    constructor(
        private key: Evaluator<Context>,
        private value: Evaluator<Context>
    ) {}

    evaluate(ctx: Context) {
        const keys = this.key.evaluate(ctx).values;
        const values = flatten(
            ctx.values.map(v => this.value.evaluate(ctx.withTarget(v)).values)
        );

        const xs: JsonMap[] = [];
        keys.forEach(k => {
            const key = 'id' in k ? k.id : k.value;
            if (typeof key !== 'string') {
                throw new RuntimeError(
                    `cannot use ${typeof key} as an object key`
                );
            }
            values.forEach(v => {
                if ('id' in v)
                    throw new RuntimeError(`unresolved identifier: ${v.id}`);
                xs.push({ [key]: v.value });
            });
        }, []);

        return xs;
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
        const fields = this.fields.map(f => f.evaluate(ctx));

        const xs = expandCombination(fields, {} as JsonMap, (prev, vs) => {
            return vs.map(v => {
                return { ...prev, ...v };
            });
        });

        return new Context(...xs.map(value => ({ value })));
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

        if ('id' in target)
            throw new RuntimeError(
                `cannot index against identifyer: '${target.id}'`
            );

        const record = target.value;
        if (!isJsonMap(record) && !Array.isArray(record)) {
            throw new RuntimeError(
                `cannot index non-object/non-array value: ${typeof record}`
            );
        }

        const keys = this.key.evaluate(ctx).values;
        return new Context(
            ...keys.map(key => {
                if ('id' in key) {
                    if (!isJsonMap(record)) {
                        throw new RuntimeError(
                            `cannot index non-object value with string: ${typeof record}`
                        );
                    }
                    return { value: record[key.id] ?? null };
                } else {
                    const index = key.value;
                    if (isJsonMap(record)) {
                        if (
                            typeof index !== 'number' &&
                            typeof index !== 'string'
                        ) {
                            throw new RuntimeError(
                                `cannot index with '${typeof key.value}'`
                            );
                        }

                        return { value: record[index] ?? null };
                    } else {
                        if (typeof index !== 'number') {
                            throw new RuntimeError(
                                `cannot index with '${typeof key.value}'`
                            );
                        }

                        const value =
                            index >= 0
                                ? record[index]
                                : record[record.length + index];
                        return {
                            value: value ?? null,
                        };
                    }
                }
            })
        );
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
        const target = ctx.target;

        if ('id' in target) {
            throw new RuntimeError(
                `cannot make slice from identifier: ${target.id}`
            );
        }
        if (typeof target.value !== 'string' && !Array.isArray(target.value)) {
            throw new RuntimeError(
                `cannot make slice from non-array value: ${target}`
            );
        }
        const sliceable = target.value;

        const start = this.first?.evaluate(ctx);
        const end = this.last?.evaluate(ctx);

        const values: string | JSONValue[] = [];
        if (start) {
            start.values.forEach(start => {
                if ('id' in start)
                    throw new RuntimeError(
                        `unexpected non-number range index: ${start}`
                    );
                if (typeof start.value !== 'number')
                    throw new RuntimeError(
                        `unexpected non-number range index: ${start}`
                    );
                const first =
                    start.value >= 0
                        ? start.value
                        : sliceable.length + start.value;

                if (end) {
                    end.values.forEach(end => {
                        if ('id' in end)
                            throw new RuntimeError(
                                `unexpected non-number range index: ${end}`
                            );
                        if (typeof end.value !== 'number')
                            throw new RuntimeError(
                                `unexpected non-number range index: ${end}`
                            );
                        const last =
                            end.value >= 0
                                ? end.value
                                : sliceable.length + end.value;
                        values.push(sliceable.slice(first, last));
                    });
                } else {
                    values.push(sliceable.slice(first));
                }
            });
        } else {
            if (end) {
                end.values.forEach(end => {
                    if ('id' in end)
                        throw new RuntimeError(
                            `unexpected non-number range index: ${end}`
                        );
                    if (typeof end.value !== 'number')
                        throw new RuntimeError(
                            `unexpected non-number range index: ${end}`
                        );
                    const last =
                        end.value >= 0
                            ? end.value
                            : sliceable.length + end.value;
                    values.push(sliceable.slice(0, last));
                });
            } else {
                values.push(sliceable);
            }
        }

        return new Context(...values.map(value => ({ value })));
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
        const target = ctx.target;

        if ('id' in target)
            throw new RuntimeError(`cannot iterate over '${target.id}'`);

        if (typeof target.value !== 'object') {
            throw new RuntimeError(
                `cannot iterate over non-object value: ${typeof target.value}`
            );
        }

        if (target.value === null) {
            throw new RuntimeError(`cannot iterate over null`);
        }

        if (Array.isArray(target.value)) {
            return new Context(...target.value.map(v => ({ value: v })));
        } else {
            const record = target.value as Record<string | number, JSONValue>;
            return new Context(
                ...Object.keys(record)
                    .map(k => record[k])
                    .map(v => ({ value: v }))
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
        public indexer: Evaluator<Context>,
        public isOptional: boolean
    ) {}

    evaluate(ctx: Context): Context {
        const targets = this.target.evaluate(ctx).values;
        return new Context(
            ...targets.reduce((acc, target) => {
                let values: Value[];
                try {
                    values = this.indexer.evaluate(
                        new ContextWithTarget(target, ...ctx.values)
                    ).values;
                } catch {
                    values = [];
                }
                return [...acc, ...values];
            }, [] as Value[])
        );
    }

    dump() {
        return {
            indexing: this.target.dump(),
            indexer: this.indexer.dump(),
            isOptional: this.isOptional,
        };
    }
}

function isJsonMap(x: JSONValue): x is Record<string, JSONValue> {
    if (x === null) return false;
    if (
        typeof x === 'number' ||
        typeof x === 'string' ||
        typeof x === 'boolean'
    )
        return false;
    if (Array.isArray(x)) return false;
    return true;
}

function mergeObject(
    lhs: Record<string, JSONValue>,
    rhs: Record<string, JSONValue>,
    overwrite: boolean
) {
    if (overwrite) {
        return { ...lhs, ...rhs };
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
        const lhs = this.lhs.evaluate(ctx).values.map(v => {
            if ('id' in v)
                throw new RuntimeError(
                    `cannot apply binary operator ${this.op} on identifier '${v.id}'`
                );
            return v.value;
        });
        const rhs = this.rhs.evaluate(ctx).values.map(v => {
            if ('id' in v)
                throw new RuntimeError(
                    `cannot apply binary operator ${this.op} on identifier '${v.id}'`
                );
            return v.value;
        });

        return new Context(
            ...lhs
                .reduce((acc: JSONValue[], l) => {
                    return [
                        ...acc,
                        ...rhs.map(r => evaluateBinaryOperator(this.op, l, r)),
                    ];
                }, [])
                .map(value => ({ value }))
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

export function evaluate(evaluator: Evaluator<Context>, json: JSONValue) {
    const result = evaluator.evaluate(new Context({ value: json }));
    return result.values.map(v => {
        if ('id' in v) {
            return v;
        } else {
            return v.value;
        }
    });
}
