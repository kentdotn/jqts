import { Scanner } from './scanner';
import { parse } from './parser';
import { optimize } from './optimize';
import { evaluate, Evaluator } from './eval';
import { Context, JSONValue as JSONValue_ } from './context';

export class JQ {
    static compile(pattern: string) {
        const scanner = new Scanner(pattern);
        return new JQ(optimize(parse(scanner)));
    }

    constructor(private evaluator: Evaluator<Context>) {}

    evaluate(value: JQ.JSONValue): JQ.JSONValue[] {
        return evaluate(this.evaluator, value);
    }

    dump() {
        return this.evaluator.dump();
    }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JQ {
    export type JSONValue = JSONValue_;
}

export default JQ;
