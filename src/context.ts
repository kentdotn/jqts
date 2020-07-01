export type JSONValue =
    | number
    | boolean
    | string
    | null
    | Array<JSONValue>
    | JsonMap;
export type JsonMap = { [key: string]: JSONValue };

export function isJsonMap(x: JSONValue): x is Record<string, JSONValue> {
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

export type Value =
    | {
          id: string;
      }
    | {
          value: JSONValue;
      }
    | {
          error: Error;
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
