import { Expr } from './expr';

export interface Statement {
    dump(): unknown;
}

export class DefFuncStatement implements Statement {
    constructor(public name: string) {}

    dump() {
        return {
            deffun: this.name,
        };
    }
}

export class ExprStatement implements Statement {
    constructor(public expr: Expr) {}

    dump() {
        return {
            expr: this.expr.dump(),
        };
    }
}

export function isExprStatement(stmt: Statement): stmt is ExprStatement {
    return 'expr' in stmt;
}

export class Statements {
    stmts: Statement[] = [];

    push(stmt: Statement) {
        this.stmts.push(stmt);
    }

    dump() {
        return {
            statements: this.stmts.map(stmt => stmt.dump()),
        };
    }
}
