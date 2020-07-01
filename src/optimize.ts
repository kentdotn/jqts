import { Statements, isExprStatement, ExprStatement } from './stmt';
import {
    Evaluator,
    RuntimeError,
    PipedEvaluator,
    ParallelEvaluator,
    BinaryOperatorEvaluator,
    IndexedEvaluator,
    SpreadEvaluator,
    SliceEvaluator,
    KeyEvaluator,
    ObjectFieldEvaluator,
    ObjectEvaluator,
    ArrayEvaluator,
    IdentityEvaluator,
    IdEvaluator,
    PrimitiveEvaluator,
} from './eval';
import {
    Expr,
    FilteredExpr,
    ParallelExpr,
    BinaryOperatorExpr,
    IndexedExpr,
    SpreadIndexer,
    RangeIndexer,
    KeyIndexer,
    ObjectExpr,
    ArrayExpr,
    IdentityExpr,
    IdExpr,
    StringLietralExpr,
    NumberLietralExpr,
    LiteralExpr,
} from './expr';
import { Context } from './context';

function optimizePrimitiveExpr(
    expr: LiteralExpr | StringLietralExpr | NumberLietralExpr
) {
    return new PrimitiveEvaluator(expr.value);
}

function optimizeIdExpr(expr: IdExpr) {
    return new IdEvaluator(expr.value);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function optimizeIdentityExpr(_expr: IdentityExpr) {
    return new IdentityEvaluator();
}

function optimizeArrayExpr(expr: ArrayExpr) {
    return new ArrayEvaluator(expr.elements.map(x => optimizeExpr(x)));
}

function optimizeObjectExpr(expr: ObjectExpr) {
    return new ObjectEvaluator(
        expr.fields.map(f => {
            const keyEval = optimizeExpr(f.key);
            if (!f.value) {
                return new ObjectFieldEvaluator(
                    keyEval,
                    new KeyEvaluator(keyEval)
                );
            } else {
                return new ObjectFieldEvaluator(keyEval, optimizeExpr(f.value));
            }
        })
    );
}

function optimizeIndexedExpr(expr: IndexedExpr) {
    if (expr.indexer instanceof SpreadIndexer) {
        return new IndexedEvaluator(
            optimizeExpr(expr.expr),
            new SpreadEvaluator(),
            expr.isOptional
        );
    }

    if (expr.indexer instanceof RangeIndexer) {
        const first = expr.indexer.first
            ? optimizeExpr(expr.indexer.first)
            : null;
        const last = expr.indexer.last ? optimizeExpr(expr.indexer.last) : null;
        return new IndexedEvaluator(
            optimizeExpr(expr.expr),
            new SliceEvaluator(first, last),
            expr.isOptional
        );
    }

    if (expr.indexer instanceof KeyIndexer) {
        return new IndexedEvaluator(
            optimizeExpr(expr.expr),
            new KeyEvaluator(optimizeExpr(expr.indexer.key)),
            expr.isOptional
        );
    }

    throw new RuntimeError(`unimplemented indexer: ${expr}`);
}

function optimizeBinaryOperatorExpr(expr: BinaryOperatorExpr) {
    return new BinaryOperatorEvaluator(
        expr.op,
        optimizeExpr(expr.lhs),
        optimizeExpr(expr.rhs)
    );
}

function optimizeParallelExpr(expr: ParallelExpr) {
    return new ParallelEvaluator(expr.exprs.map(optimizeExpr));
}

function optimizeFilteredExpr(expr: FilteredExpr) {
    return new PipedEvaluator(expr.exprs.map(optimizeExpr));
}

function optimizeExpr(expr: Expr): Evaluator<Context> {
    if (expr instanceof FilteredExpr) {
        return optimizeFilteredExpr(expr);
    }

    if (expr instanceof ParallelExpr) {
        return optimizeParallelExpr(expr);
    }

    if (expr instanceof BinaryOperatorExpr) {
        return optimizeBinaryOperatorExpr(expr);
    }

    if (expr instanceof IndexedExpr) {
        return optimizeIndexedExpr(expr);
    }

    if (expr instanceof ObjectExpr) {
        return optimizeObjectExpr(expr);
    }

    if (expr instanceof ArrayExpr) {
        return optimizeArrayExpr(expr);
    }

    if (expr instanceof IdentityExpr) {
        return optimizeIdentityExpr(expr);
    }

    if (expr instanceof IdExpr) {
        return optimizeIdExpr(expr);
    }

    if (
        expr instanceof LiteralExpr ||
        expr instanceof StringLietralExpr ||
        expr instanceof NumberLietralExpr
    ) {
        return optimizePrimitiveExpr(expr);
    }

    throw new RuntimeError(`unsupported expression: ${expr}`);
}

export function optimize(stmts: Statements): Evaluator<Context> {
    // Here, we just make an `evaluator` from given expression tree...
    // We do not have real `optimizer` yet, sorry.

    // We are very sorry again but we do not support function definition yet.
    const exprs = stmts.stmts.filter(s =>
        isExprStatement(s)
    ) as ExprStatement[];
    if (exprs.length > 1) {
        throw new RuntimeError(`too munknown expressions`);
    }
    const [root] = exprs;
    if (!root) {
        throw new RuntimeError(`no valid expression`);
    }

    return optimizeExpr(root.expr);
}
