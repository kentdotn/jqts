export class RuntimeError extends Error {}

export class UnknownError extends RuntimeError {
    constructor(public readonly reason: unknown) {
        super('unknown error');
    }
}

export class UnexpectedIdError extends RuntimeError {
    constructor(id: string) {
        super(`unexpected identifier: ${id}`);
    }
}
