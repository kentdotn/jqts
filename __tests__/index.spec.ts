import JQ from '../src';

test('Identity', () => {
    const json = 'Hello, world!';
    expect(JQ.compile('.').evaluate(json)).toStrictEqual(['Hello, world!']);
});

test('Object Identifier-Index', () => {
    const json = { foo: 42, bar: 'less interesting data' };
    expect(JQ.compile('.foo').evaluate(json)).toStrictEqual([42]);
});

test('Object Identifier-Index', () => {
    const json = { notfoo: true, alsonotfoo: false };
    expect(JQ.compile('.foo').evaluate(json)).toStrictEqual([null]);
});

test('Optional Object Identifier-Index', () => {
    const json = { foo: 42, bar: 'less interesting data' };
    expect(JQ.compile('.foo?').evaluate(json)).toStrictEqual([42]);
});

test('Optional Object Identifier-Index', () => {
    const json = { notfoo: true, alsonotfoo: false };
    expect(JQ.compile('.foo?').evaluate(json)).toStrictEqual([null]);
});

test('Optional Object Identifier-Index', () => {
    const json = [1, 2];
    expect(JQ.compile('[.foo?]').evaluate(json)).toStrictEqual([[]]);
});

test('Generic Object Index', () => {
    const json = { foo: 42 };
    expect(JQ.compile('.["foo"]').evaluate(json)).toStrictEqual([42]);
});

test('Generic Object Index', () => {
    const json = { foo: 42 };
    expect(JQ.compile('.["foo"]?').evaluate(json)).toStrictEqual([42]);
});

test('Array Index', () => {
    expect(
        JQ.compile('.[0]').evaluate([
            { name: 'JSON', good: true },
            { name: 'XML', good: false },
        ])
    ).toStrictEqual([{ name: 'JSON', good: true }]);
});

test('Array Index', () => {
    expect(
        JQ.compile('.[2]').evaluate([
            { name: 'JSON', good: true },
            { name: 'XML', good: false },
        ])
    ).toStrictEqual([null]);
});

test('Array Index', () => {
    expect(JQ.compile('.[-2]').evaluate([1, 2, 3])).toStrictEqual([2]);
});

test('Array Slice', () => {
    expect(
        JQ.compile('.[2:4]').evaluate(['a', 'b', 'c', 'd', 'e'])
    ).toStrictEqual([['c', 'd']]);
});

test('Array Slice', () => {
    expect(
        JQ.compile('.[:3]').evaluate(['a', 'b', 'c', 'd', 'e'])
    ).toStrictEqual([['a', 'b', 'c']]);
});

test('Array Slice', () => {
    expect(
        JQ.compile('.[-2:]').evaluate(['a', 'b', 'c', 'd', 'e'])
    ).toStrictEqual([['d', 'e']]);
});

test('String Slice', () => {
    expect(JQ.compile('.[2:4]').evaluate('abcdefghi')).toStrictEqual(['cd']);
});

test('String Slice', () => {
    expect(JQ.compile('.[:3]').evaluate('abcdefghi')).toStrictEqual(['abc']);
});

test('String Slice', () => {
    expect(JQ.compile('.[-2:]').evaluate('abcdefghi')).toStrictEqual(['hi']);
});

test('Array/Object Value Iterator', () => {
    expect(
        JQ.compile('.[]').evaluate([
            { name: 'JSON', good: true },
            { name: 'XML', good: false },
        ])
    ).toStrictEqual([
        { name: 'JSON', good: true },
        { name: 'XML', good: false },
    ]);
});

test('Array/Object Value Iterator', () => {
    expect(JQ.compile('.[]').evaluate([])).toStrictEqual([]);
});

test('Array/Object Value Iterator', () => {
    expect(JQ.compile('.[]').evaluate({ a: 1, b: 1 })).toStrictEqual([1, 1]);
});

test('Optional Array/Object Value Iterator', () => {
    expect(JQ.compile('.[]?').evaluate({ a: 1, b: 1 })).toStrictEqual([1, 1]);
});

test('Optional Array/Object Value Iterator', () => {
    expect(JQ.compile('.[]?').evaluate(1)).toStrictEqual([]);
});

test('Comma', () => {
    expect(
        JQ.compile('.foo, .bar').evaluate({
            foo: 42,
            bar: 'something else',
            baz: true,
        })
    ).toStrictEqual([42, 'something else']);
});

test('Comma', () => {
    expect(
        JQ.compile('.user, .projects[]').evaluate({
            user: 'stedolan',
            projects: ['jq', 'wikiflow'],
        })
    ).toStrictEqual(['stedolan', 'jq', 'wikiflow']);
});

test('Comma', () => {
    expect(
        JQ.compile('.[4,2]').evaluate(['a', 'b', 'c', 'd', 'e'])
    ).toStrictEqual(['e', 'c']);
});

test('Pipe', () => {
    expect(
        JQ.compile('.[] | .name').evaluate([
            { name: 'JSON', good: true },
            { name: 'XML', good: false },
        ])
    ).toStrictEqual(['JSON', 'XML']);
});

test('Parenthesis', () => {
    expect(JQ.compile('(. + 2) * 5').evaluate(1)).toStrictEqual([15]);
});

test('Array construction', () => {
    expect(
        JQ.compile('[.user, .projects[]]').evaluate({
            user: 'stedolan',
            projects: ['jq', 'wikiflow'],
        })
    ).toStrictEqual([['stedolan', 'jq', 'wikiflow']]);
});

test('Array construction', () => {
    expect(JQ.compile('[ .[] | . * 2]').evaluate([1, 2, 3])).toStrictEqual([
        [2, 4, 6],
    ]);
});

test('Object Construction', () => {
    expect(
        JQ.compile('{user, title: .titles[]}').evaluate({
            user: 'stedolan',
            titles: ['JQ Primer', 'More JQ'],
        })
    ).toStrictEqual([
        { user: 'stedolan', title: 'JQ Primer' },
        { user: 'stedolan', title: 'More JQ' },
    ]);
});

test('Object Construction', () => {
    expect(
        JQ.compile('{(.user): .titles}').evaluate({
            user: 'stedolan',
            titles: ['JQ Primer', 'More JQ'],
        })
    ).toStrictEqual([{ stedolan: ['JQ Primer', 'More JQ'] }]);
});

test.skip('Recursive Descent', () => {
    expect(JQ.compile('..|.a?').evaluate([[{ a: 1 }]])).toStrictEqual([1]);
});

test('Addition', () => {
    expect(JQ.compile('.a + 1').evaluate({ a: 7 })).toStrictEqual([8]);
});

test('Addition', () => {
    expect(
        JQ.compile('.a + .b').evaluate({ a: [1, 2], b: [3, 4] })
    ).toStrictEqual([[1, 2, 3, 4]]);
});

test('Addition', () => {
    expect(JQ.compile('.a + null').evaluate({ a: 1 })).toStrictEqual([1]);
});

test('Addition', () => {
    expect(JQ.compile('.a + 1').evaluate({})).toStrictEqual([1]);
});

test('Addition', () => {
    expect(
        JQ.compile('{a: 1} + {b: 2} + {c: 3} + {a: 42}').evaluate(null)
    ).toStrictEqual([{ a: 42, b: 2, c: 3 }]);
});

test('Subtraction', () => {
    expect(JQ.compile('4 - .a').evaluate({ a: 3 })).toStrictEqual([1]);
});

test('Subtraction', () => {
    expect(
        JQ.compile('. - ["xml", "yaml"]').evaluate(['xml', 'yaml', 'json'])
    ).toStrictEqual([['json']]);
});

test('Multiplication, division, modulo', () => {
    expect(JQ.compile('10 / . * 3').evaluate(5)).toStrictEqual([6]);
});

test('Multiplication, division, modulo', () => {
    expect(JQ.compile('. / ", "').evaluate('a, b,c,d, e')).toStrictEqual([
        ['a', 'b,c,d', 'e'],
    ]);
});

test('Multiplication, division, modulo', () => {
    expect(
        JQ.compile('{"k": {"a": 1, "b": 2}} * {"k": {"a": 0,"c": 3}}').evaluate(
            null
        )
    ).toStrictEqual([{ k: { a: 0, b: 2, c: 3 } }]);
});

test('Multiplication, division, modulo', () => {
    expect(JQ.compile('.[] | (1 / .)').evaluate([1, -1])).toStrictEqual([
        1,
        -1,
    ]);
});

test('Multiplication, division, modulo', () => {
    expect(JQ.compile('.[] | (1 / .)?').evaluate([1, 0, -1])).toStrictEqual([
        1,
        -1,
    ]);
});
