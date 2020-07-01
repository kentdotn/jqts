function testWithString(target: string, pattern: string): string[] {
    return target.startsWith(pattern) ? [pattern] : [];
}

function testWithRegExp(target: string, pattern: RegExp): string[] {
    const result = pattern.exec(target);
    if (!result) return [];
    return result;
}

export class Scanner {
    constructor(public target: string, trim = true) {
        if (trim) {
            this.trimWhitespaces();
        }
    }

    scan(pattern: string | RegExp, trim = true) {
        const [matched, ...groups] =
            typeof pattern === 'string'
                ? testWithString(this.target, pattern)
                : testWithRegExp(this.target, pattern);
        if (!matched) return null;

        this.target = this.target.substring(matched.length);
        if (trim) {
            this.trimWhitespaces();
        }

        return [matched, ...groups];
    }

    trimWhitespaces() {
        this.target = this.target.replace(/^\s+/, '');
    }
}
