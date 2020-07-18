export interface Expr {
    dump(): unknown;
}

export class LiteralExpr implements Expr {
    constructor(public value: number | string | boolean | null) {}

    dump() {
        return this.value;
    }
}

export class StringLiteralExpr implements Expr {
    constructor(public parts: string[]) {}

    get value(): string {
        return this.parts.join();
    }

    dump() {
        return this.value;
    }
}

export class FunctionCallExpr implements Expr {
    constructor(public funcname: string, public args: Expr[]) {}

    dump() {
        return { call: { [this.funcname]: this.args } };
    }
}

export class IdExpr implements Expr {
    constructor(public value: string) {}

    dump() {
        return { id: this.value };
    }
}

export class RecursiveDescendantExpr implements Expr {
    dump() {
        return { recursiveDescendant: 0 };
    }
}

export class IdentityExpr implements Expr {
    identity = true;

    dump() {
        return { identity: 0 };
    }
}

export function isIdentityExpr(expr: Expr): expr is IdentityExpr {
    return 'identity' in expr;
}

export class ArrayExpr implements Expr {
    elements: Expr[] = [];

    push(expr: Expr) {
        this.elements.push(expr);
    }

    dump() {
        return {
            array: this.elements.map(x => x.dump()),
        };
    }
}

export class Field {
    constructor(public key: Expr, public value: Expr | null = null) {}

    dump() {
        return {
            key: this.key.dump(),
            value: this.value?.dump(),
        };
    }
}

export class ObjectExpr implements Expr {
    fields: Field[] = [];

    push(field: Field) {
        this.fields.push(field);
    }

    dump() {
        return {
            object: this.fields.map(x => x.dump()),
        };
    }
}

export interface Indexer {
    dump(): unknown;
}

export class RangeIndexer implements Indexer {
    constructor(public first: Expr | null, public last: Expr | null = null) {}

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

export class KeyIndexer implements Indexer {
    constructor(public key: Expr) {}

    dump() {
        return { key: this.key };
    }
}

export class SpreadIndexer implements Indexer {
    dump() {
        return { spread: 0 };
    }
}

export class IndexedExpr implements Expr {
    constructor(
        public expr: Expr,
        public indexer: Indexer,
        public isOptional: boolean
    ) {}

    dump() {
        return {
            indexing: this.expr.dump(),
            indexer: this.indexer.dump(),
            isOptional: this.isOptional,
        };
    }
}

export class BinaryOperatorExpr implements Expr {
    constructor(public op: string, public lhs: Expr, public rhs: Expr) {}

    dump() {
        return {
            [this.op]: [this.lhs?.dump(), this.rhs?.dump()],
        };
    }
}

export class ParallelExpr implements Expr {
    exprs: Expr[] = [];

    push(expr: Expr) {
        this.exprs.push(expr);
    }

    dump() {
        if (this.exprs.length < 2) {
            return this.exprs[0]?.dump();
        }
        return {
            parallel: this.exprs.map(x => x.dump()),
        };
    }
}

export class FilteredExpr implements Expr {
    exprs: Expr[] = [];

    push(expr: Expr) {
        this.exprs.push(expr);
    }

    dump() {
        if (this.exprs.length < 2) {
            return this.exprs[0]?.dump();
        }
        return {
            filtered: this.exprs.map(x => x.dump()),
        };
    }
}

export class OptionalExpr implements Expr {
    constructor(public expr: Expr) {}

    dump() {
        {
            optional: this.expr.dump();
        }
    }
}
