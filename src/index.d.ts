declare namespace module {
    export const parent: unknown | null;
}

declare namespace process {
    const argv: string[];
    const stdin: {
        isTTY: boolean;
        on(event: 'readable' | 'end', callback: () => void): void;
        setEncoding(encoding: string): void;
        read(size?: number): string | null;
        readable: boolean;
    };
}
