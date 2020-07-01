import { Scanner } from './scanner';
import { DefFuncStatement, Statement, ExprStatement, Statements } from './stmt';
import {
    Expr,
    NumberLietralExpr,
    StringLietralExpr,
    IdExpr,
    RecursiveDescendantExpr,
    IdentityExpr,
    FilteredExpr,
    ArrayExpr,
    Field,
    ObjectExpr,
    Indexer,
    RangeIndexer,
    KeyIndexer,
    SpreadIndexer,
    IndexedExpr,
    BinaryOperatorExpr,
    ParallelExpr,
    isIdentityExpr,
    LiteralExpr,
    OptionalExpr,
} from './expr';

class ParseError extends Error {}

function parseFunctionDefinition(scanner: Scanner): DefFuncStatement | null {
    if (scanner.target.length > 0) {
        if (scanner.scan('def')) {
            throw new ParseError(`not supported: user-defined funtions`);
        }
    }
    return null;
}

function parseNullLiteral(scanner: Scanner): Expr | null {
    const result = scanner.scan('null');
    if (result) {
        return new LiteralExpr(null);
    } else {
        return null;
    }
}

function parseNumberLiteral(scanner: Scanner): Expr | null {
    const result = scanner.scan(/^[\+\-]?\s*[0-9]+/);
    if (result) {
        return new NumberLietralExpr(parseInt(result[0]));
    } else {
        return null;
    }
}

function parseStringLiteral(scanner: Scanner): Expr | null {
    const [quote] = scanner.scan(/^('|")/, false) ?? [];
    if (!quote) return null;

    const parts: string[] = [];

    const pattern = new RegExp(`^[^${quote}\\\\]*`);
    while (scanner.target.length > 0) {
        const [part] = scanner.scan(pattern, false) ?? [];
        if (part) {
            parts.push(part);
        }

        if (scanner.scan(quote)) {
            return new StringLietralExpr(parts);
        }

        if (scanner.scan('\\', false)) {
            throw new ParseError(
                `escape sequence is not supported yet: ${scanner.target}`
            );
        }
        // TODO: handle escape sequence and push it onto `parts`
    }

    throw new ParseError(`cannot find closing ${quote}`);
}

function parseIdentifier(scanner: Scanner): Expr | null {
    const [id] = scanner.scan(/^[a-zA-Z_][a-zA-Z_0-9]*/) ?? [];
    if (id) {
        return new IdExpr(id);
    }

    return null;
}

function parseDoulbeDot(scanner: Scanner): Expr | null {
    if (scanner.scan('..')) {
        return new RecursiveDescendantExpr();
    }
    return null;
}

function parseDot(scanner: Scanner): Expr | null {
    if (scanner.scan('.')) {
        return new IdentityExpr();
    }
    return null;
}

function parseArrayElement(scanner: Scanner): Expr | null {
    const first = parseStandaloneExpression(scanner);
    if (!first) return null;

    const root = new FilteredExpr();
    root.push(first);

    while (scanner.target.length > 0) {
        if (!scanner.scan('|')) break;

        const next = parseStandaloneExpression(scanner);
        if (!next) {
            throw new ParseError(
                `missing right side expression right of '|': ${scanner.target}`
            );
        }

        root.push(next);
    }

    return root;
}

function parseArrayExpr(scanner: Scanner): Expr | null {
    if (!scanner.scan('[')) return null;

    const expr = new ArrayExpr();

    const first = parseArrayElement(scanner);
    if (!first) {
        if (scanner.scan(']')) {
            return expr;
        }

        throw new ParseError(`missing closing bracket: ${scanner.target}`);
    }
    expr.push(first);

    while (scanner.target.length > 0) {
        if (scanner.scan(']')) {
            return expr;
        }

        if (!scanner.scan(',')) {
            throw new ParseError(`missing comma in array: ${scanner.target}`);
        }

        const elem = parseArrayElement(scanner);
        if (!elem) {
            throw new ParseError(`missing closing bracket: ${scanner.target}`);
        }

        expr.push(elem);
    }

    if (!scanner.scan(']')) {
        throw new ParseError(`missing closing bracket: ${scanner.target}`);
    }

    return expr;
}

function parseObjectFieldKey(scanner: Scanner): Expr | null {
    const grp = parseGroupExpr(scanner);
    if (grp) return grp;

    const str = parseStringLiteral(scanner);
    if (str) return str;

    const id = parseIdentifier(scanner);
    if (id) return id;

    return null;
}

function parseObjectField(scanner: Scanner): Field | null {
    const key = parseObjectFieldKey(scanner);
    if (!key) {
        throw new ParseError(`missing field key: ${scanner.target}`);
    }

    if (!scanner.scan(':')) {
        return new Field(key);
    }

    const value = parseStandaloneExpression(scanner);
    if (!value) {
        throw new ParseError(`missing field value: ${scanner.target}`);
    }

    return new Field(key, value);
}

function parseObjectExpr(scanner: Scanner): Expr | null {
    if (!scanner.scan('{')) return null;

    const expr = new ObjectExpr();
    if (scanner.scan('}')) return expr;

    const first = parseObjectField(scanner);
    if (!first) {
        throw new ParseError(`missing closing brace: ${scanner.target}`);
    }
    expr.push(first);

    while (scanner.target.length > 0) {
        if (scanner.scan('}')) {
            return expr;
        }

        if (!scanner.scan(',')) {
            throw new ParseError(`missing comma in object: ${scanner.target}`);
        }

        const field = parseObjectField(scanner);
        if (!field) {
            throw new ParseError(`missing closing brace: ${scanner.target}`);
        }

        expr.push(field);
    }

    throw new ParseError(`missing closing brace: ${scanner.target}`);
}

function parseGroupExpr(scanner: Scanner): Expr | null {
    if (!scanner.scan('(')) return null;

    const expr = parseExpression(scanner);

    if (!scanner.scan(')')) {
        throw new ParseError(`missing closing paren: ${scanner.target}`);
    }

    return expr;
}

function parsePrimitiveExpression(scanner: Scanner): Expr | null {
    const grp = parseGroupExpr(scanner);
    if (grp) {
        return grp;
    }

    const ary = parseArrayExpr(scanner);
    if (ary) {
        return ary;
    }

    const obj = parseObjectExpr(scanner);
    if (obj) {
        return obj;
    }

    const str = parseStringLiteral(scanner);
    if (str) {
        return str;
    }

    const num = parseNumberLiteral(scanner);
    if (num) {
        return num;
    }

    const nl = parseNullLiteral(scanner);
    if (nl) {
        return nl;
    }

    const id = parseIdentifier(scanner);
    if (id) {
        return id;
    }

    const recursive = parseDoulbeDot(scanner);
    if (recursive) {
        return recursive;
    }

    const dot = parseDot(scanner);
    if (dot) {
        return dot;
    }

    return null;
}

function parseArrayLikeIndexer(scanner: Scanner): Indexer | null {
    if (scanner.target.length == 0) return null;

    if (!scanner.scan('[')) return null;

    const startOrKey = parseExpression(scanner);
    let last: Expr | null = null;
    let isRange = false;

    if (scanner.scan(':')) {
        isRange = true;
        last = parsePrimitiveExpression(scanner);
    }

    if (!scanner.scan(']')) {
        throw new ParseError(`no closing bracket: ${scanner.target}`);
    }
    return isRange
        ? new RangeIndexer(startOrKey, last)
        : startOrKey
        ? new KeyIndexer(startOrKey)
        : new SpreadIndexer();
}

function parseDotIndexer(scanner: Scanner): Indexer | null {
    if (scanner.target.length == 0) return null;

    const str = parseStringLiteral(scanner);
    if (str) {
        return new KeyIndexer(str);
    }

    const id = parseIdentifier(scanner);
    if (id) {
        return new KeyIndexer(id);
    }

    return null;
}

function parseIndexer(scanner: Scanner): Indexer | null {
    if (scanner.target.length > 0) {
        const arrayIndexer = parseArrayLikeIndexer(scanner);
        if (arrayIndexer) {
            return arrayIndexer;
        }

        if (!scanner.scan('.')) return null;
        const dotIndexer = parseDotIndexer(scanner);
        if (dotIndexer) {
            return dotIndexer;
        }
        throw new ParseError(`no valid key: ${scanner.target}`);
    }
    return null;
}

function parseIndexedExpr(scanner: Scanner): Expr | null {
    if (scanner.target.length > 0) {
        let lhs = parsePrimitiveExpression(scanner);
        if (!lhs) return null;

        if (isIdentityExpr(lhs)) {
            const indexer = parseDotIndexer(scanner);
            if (indexer) {
                lhs = new IndexedExpr(lhs, indexer, false);
            }
        }
        if (scanner.scan('?')) {
            lhs = new OptionalExpr(lhs);
        }

        while (scanner.target.length > 0) {
            const indexer = parseIndexer(scanner);
            if (!indexer) break;

            lhs = new IndexedExpr(lhs, indexer, false);
            if (scanner.scan('?')) {
                lhs = new OptionalExpr(lhs);
            }
        }

        return lhs;
    }
    return null;
}

function parseMultiplicativeExpr(scanner: Scanner): Expr | null {
    let lhs: Expr | null = null;
    let op: string | null = null;

    while (scanner.target.length > 0) {
        const subexpr = parseIndexedExpr(scanner);
        if (!subexpr) break;

        if (lhs && op) {
            lhs = new BinaryOperatorExpr(op, lhs, subexpr);
            op = null;
        } else {
            lhs = subexpr;
        }

        const result = scanner.scan(/^(\*|\/|%)/);
        if (!result) break;

        op = result[0];
    }

    return lhs;
}

function parseAdditiveExpr(scanner: Scanner): Expr | null {
    let lhs: Expr | null = null;
    let op: string | null = null;

    while (scanner.target.length > 0) {
        const subexpr = parseMultiplicativeExpr(scanner);
        if (!subexpr) break;

        if (lhs && op) {
            lhs = new BinaryOperatorExpr(op, lhs, subexpr);
            op = null;
        } else {
            lhs = subexpr;
        }

        const result = scanner.scan(/^(\+|\-)/);
        if (!result) break;

        op = result[0];
    }

    return lhs;
}

function parseComparativeExpr(scanner: Scanner): Expr | null {
    let lhs: Expr | null = null;
    let op: string | null = null;

    while (scanner.target.length > 0) {
        const subexpr = parseAdditiveExpr(scanner);
        if (!subexpr) break;

        if (lhs && op) {
            lhs = new BinaryOperatorExpr(op, lhs, subexpr);
            op = null;
        } else {
            lhs = subexpr;
        }

        const result = scanner.scan(/^(==|!=|<=|<|>=|>)/);
        if (!result) break;

        op = result[0];
    }

    return lhs;
}

function parseLogicalAndExpr(scanner: Scanner): Expr | null {
    let lhs: Expr | null = null;

    while (scanner.target.length > 0) {
        const subexpr = parseComparativeExpr(scanner);
        if (!subexpr) break;

        if (lhs) {
            lhs = new BinaryOperatorExpr('and', lhs, subexpr);
        } else {
            lhs = subexpr;
        }

        const result = scanner.scan('and');
        if (!result) break;
    }

    return lhs;
}

function parseLogicalOrExpression(scanner: Scanner): Expr | null {
    let lhs: Expr | null = null;

    while (scanner.target.length > 0) {
        const subexpr = parseLogicalAndExpr(scanner);
        if (!subexpr) break;

        if (lhs) {
            lhs = new BinaryOperatorExpr('or', lhs, subexpr);
        } else {
            lhs = subexpr;
        }

        const result = scanner.scan('or');
        if (!result) break;
    }

    return lhs;
}

function parseArithmeticExpression(scanner: Scanner): Expr | null {
    return parseLogicalOrExpression(scanner);
}

function parseStandaloneExpression(scanner: Scanner): Expr | null {
    return parseArithmeticExpression(scanner);
}

function parseParallelExpression(scanner: Scanner): Expr | null {
    const first = parseStandaloneExpression(scanner);
    if (!first) return null;

    const root = new ParallelExpr();
    root.push(first);

    while (scanner.target.length > 0) {
        if (!scanner.scan(',')) break;

        const next = parseArithmeticExpression(scanner);
        if (!next) {
            throw new ParseError(
                `missing expr right side of ',': ${scanner.target}`
            );
        }

        root.push(next);
    }

    return root;
}

function parseFilteredExpression(scanner: Scanner): Expr | null {
    const first = parseParallelExpression(scanner);
    if (!first) return null;

    const root = new FilteredExpr();
    root.push(first);

    while (scanner.target.length > 0) {
        if (!scanner.scan('|')) break;

        const next = parseParallelExpression(scanner);
        if (!next) {
            throw new ParseError(
                `missing expr right side of '|': ${scanner.target}`
            );
        }

        root.push(next);
    }

    return root;
}

function parseExpression(scanner: Scanner): Expr | null {
    return parseFilteredExpression(scanner);
}

function parseStatement(scanner: Scanner): Statement | null {
    if (scanner.target.length > 0) {
        const deffun = parseFunctionDefinition(scanner);
        if (deffun) {
            return deffun;
        }

        const expr = parseExpression(scanner);
        if (expr) {
            return new ExprStatement(expr);
        }
    }
    return null;
}

function parseStatements(scanner: Scanner) {
    const stmts = new Statements();
    while (scanner.target.length > 0) {
        const stmt = parseStatement(scanner);
        if (!stmt) break;
        stmts.push(stmt);

        if (!scanner.scan(';')) break;
    }
    if (scanner.target.length > 0) {
        throw new ParseError(
            `cannot parse whole pattern: consumed = ${JSON.stringify(
                stmts.dump()
            )} rest = <${scanner.target}>`
        );
    }
    return stmts;
}

export function parse(scanner: Scanner) {
    return parseStatements(scanner);
}
