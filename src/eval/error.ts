export class RuntimeError extends Error {}

export class UnexpectedIdError extends RuntimeError {
    constructor(id: string) {
        super(`unexpected identifier: ${id}`);
    }
}
