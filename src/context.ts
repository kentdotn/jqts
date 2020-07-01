export type JSONValue =
    | number
    | boolean
    | string
    | null
    | Array<JSONValue>
    | JsonMap;
export type JsonMap = { [key: string]: JSONValue };

export type Value =
    | {
          id: string;
      }
    | {
          value: JSONValue;
      };

export class Context {
    values: Value[];

    constructor(...values: Value[]) {
        this.values = values;
    }

    withTarget(target: Value) {
        return new ContextWithTarget(target, ...this.values);
    }
}

export class ContextWithTarget extends Context {
    constructor(public target: Value, ...values: Value[]) {
        super(...values);
    }
}
