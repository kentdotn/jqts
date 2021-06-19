import {
    Context,
    JSONValue,
    Value,
    ContextWithTarget,
    JsonMap,
    isJsonMap,
} from '../context';
import { functions, standardFunction } from './functions';
import {
    ensureValue,
    ensureObjectKey,
    ensureObjectKeyOrArrayIndexable,
    ensureSlicable,
    ensureArrayIndexable,
} from './ensure';
import { RuntimeError } from './error';
import { flatten, expandCombination } from './utility';
import {
    multiplyOperator,
    divideOperator,
    moduloOperator,
    addOperator,
    minusOperator,
    andOperator,
    orOperator,
    greaterThanOperator,
    greaterThanOrEqualToOperator,
    lessThanOperator,
    lessThanOrEqualToOperator,
    notEqualOperator,
    equalOperator,
    alternativeOperator,
} from './functions/operators';

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

export class ArrayEvaluator implements Evaluator<Context> {
    constructor(private elements: Evaluator<Context>[]) {}

    evaluate(ctx: Context) {
        try {
            const xs = ctx.values.map(v => {
                const ctx0 = new Context(v);
                return flatten(
                    this.elements
                        .map(x => x.evaluate(ctx0))
                        .filter(r => r.values.length > 0)
                        .map(r => r.values)
                );
            });

            return new Context(
                ...xs.map(x => ({
                    value: x.map(ensureValue),
                }))
            );
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

const knownOperators: Record<
    string,
    (lhs: JSONValue, rhs: JSONValue) => JSONValue
> = {
    '*': multiplyOperator,
    '/': divideOperator,
    '%': moduloOperator,
    '+': addOperator,
    '-': minusOperator,
    and: andOperator,
    or: orOperator,
    '//': alternativeOperator,
    '>': greaterThanOperator,
    '>=': greaterThanOrEqualToOperator,
    '<': lessThanOperator,
    '<=': lessThanOrEqualToOperator,
    '!=': notEqualOperator,
    '==': equalOperator,
};

export class BinaryOperatorEvaluator implements Evaluator<Context> {
    private func: (lhs: JSONValue, rhs: JSONValue) => JSONValue;

    constructor(
        private op: string,
        private lhs: Evaluator<Context>,
        private rhs: Evaluator<Context>
    ) {
        if (op in knownOperators) {
            this.func = knownOperators[op];
        } else {
            throw new RuntimeError(
                `cannot apply binary operator '${op}' with ${typeof lhs} and ${typeof rhs}`
            );
        }
    }

    evaluate(ctx: Context) {
        return standardFunction((_, lhs, rhs) => this.func(lhs, rhs))(ctx, [
            this.lhs,
            this.rhs,
        ]);
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
