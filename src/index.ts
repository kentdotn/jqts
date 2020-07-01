import { Scanner } from './scanner';
import { parse } from './parser';
import { optimize } from './optimize';
import { evaluate, Evaluator } from './eval';
import { Context, JSONValue } from './context';

export default class JQ {
    static compile(pattern: string) {
        const scanner = new Scanner(pattern);
        return new JQ(optimize(parse(scanner)));
    }

    constructor(private evaluator: Evaluator<Context>) {}

    evaluate(value: JSONValue): JSONValue[] {
        return evaluate(this.evaluator, value);
    }

    dump() {
        return this.evaluator.dump();
    }
}
