import JQ from '../src';
import { RuntimeError } from '../src/eval/error';

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

test('Types and Values', () => {
    expect(JQ.compile('123, 4.56, 0.78, 1e2, 2e-3').evaluate(1)).toStrictEqual([
        123, 4.56, 0.78, 100, 0.002,
    ]);
});

test('Types and Values', () => {
    expect(JQ.compile('"abc"').evaluate(1)).toStrictEqual(['abc']);
});

test('Types and Values', () => {
    expect(JQ.compile('true, false').evaluate(1)).toStrictEqual([true, false]);
});

test('Types and Values', () => {
    expect(JQ.compile('[1, 2], {"xyz": 789}').evaluate(1)).toStrictEqual([
        [1, 2],
        { xyz: 789 },
    ]);
});

test('Types and Values', () => {
    expect(JQ.compile('null').evaluate(1)).toStrictEqual([null]);
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

test('Array construction (Multiple Input)', () => {
    expect(JQ.compile('.[] | [ . ]').evaluate([1, 2])).toStrictEqual([
        [1],
        [2],
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

test('Object Construction (iterate as needed)', () => {
    expect(
        JQ.compile('.[] | { x: ., y: . + 1 }').evaluate([1, 2, 3])
    ).toStrictEqual([
        {
            x: 1,
            y: 2,
        },
        {
            x: 2,
            y: 3,
        },
        {
            x: 3,
            y: 4,
        },
    ]);
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
        1, -1,
    ]);
});

test('Multiplication, division, modulo', () => {
    expect(JQ.compile('.[] | (1 / .)?').evaluate([1, 0, -1])).toStrictEqual([
        1, -1,
    ]);
});

test('length', () => {
    expect(
        JQ.compile('.[] | length').evaluate([[1, 2], 'string', { a: 2 }, null])
    ).toStrictEqual([2, 6, 1, 0]);
});

test('utf8bytelength', () => {
    expect(JQ.compile('utf8bytelength').evaluate('\u03bc')).toStrictEqual([2]);
});

test('keys, keys_unsorted', () => {
    expect(
        JQ.compile('keys').evaluate({ abc: 1, abcd: 2, Foo: 3 })
    ).toStrictEqual([['Foo', 'abc', 'abcd']]);
});

test('keys, keys_unsorted', () => {
    expect(JQ.compile('keys').evaluate([42, 3, 35])).toStrictEqual([[0, 1, 2]]);
});

test('has(key)', () => {
    expect(
        JQ.compile('map(has("foo"))').evaluate([{ foo: 42 }, {}])
    ).toStrictEqual([[true, false]]);
});

test('has(key)', () => {
    expect(
        JQ.compile('map(has(2))').evaluate([
            [0, 1],
            ['a', 'b', 'c'],
        ])
    ).toStrictEqual([[false, true]]);
});

test('in', () => {
    expect(
        JQ.compile('.[] | in({"foo": 42})').evaluate(['foo', 'bar'])
    ).toStrictEqual([true, false]);
});

test('in', () => {
    expect(JQ.compile('map(in([0,1]))').evaluate([2, 0])).toStrictEqual([
        [false, true],
    ]);
});

test('map(x), map_values(x)', () => {
    expect(JQ.compile('[.[]|.+1]').evaluate([1, 2, 3])).toStrictEqual([
        [2, 3, 4],
    ]);
});

test.skip('map(x), map_values(x)', () => {
    expect(
        JQ.compile('map_values(.+1)').evaluate({ a: 1, b: 2, c: 3 })
    ).toStrictEqual([{ a: 2, b: 3, c: 4 }]);
});

test.skip('path(path_expression)', () => {
    expect(JQ.compile('path(.a[0].b)').evaluate(null)).toStrictEqual([
        ['a', 0, 'b'],
    ]);
});

test.skip('path(path_expression)', () => {
    expect(JQ.compile('[path(..)]').evaluate({ a: [{ b: 1 }] })).toStrictEqual([
        [[], ['a'], ['a', 0], ['a', 0, 'b']],
    ]);
});

test.skip('del(path_expression)', () => {
    expect(
        JQ.compile('del(.foo)').evaluate({ foo: 42, bar: 9001, baz: 42 })
    ).toStrictEqual([{ bar: 9001, baz: 42 }]);
});

test.skip('del(path_expression)', () => {
    expect(
        JQ.compile('del(.[1, 2])').evaluate(['foo', 'bar', 'baz'])
    ).toStrictEqual([['foo']]);
});

test.skip('getpath(PATHS)', () => {
    expect(JQ.compile('getpath(["a","b"])').evaluate(null)).toStrictEqual([
        null,
    ]);
});

test.skip('getpath(PATHS)', () => {
    expect(
        JQ.compile('[getpath(["a","b"], ["a","c"])]').evaluate({
            a: { b: 0, c: 1 },
        })
    ).toStrictEqual([[0, 1]]);
});

test.skip('setpath(PATHS; VALUE)', () => {
    expect(JQ.compile('setpath(["a","b"]; 1)').evaluate(null)).toStrictEqual([
        { a: { b: 1 } },
    ]);
});

test.skip('setpath(PATHS; VALUE)', () => {
    expect(
        JQ.compile('setpath(["a","b"]; 1)').evaluate({ a: { b: 0 } })
    ).toStrictEqual([{ a: { b: 1 } }]);
});

test.skip('setpath(PATHS; VALUE)', () => {
    expect(JQ.compile('setpath([0,"a"]; 1)').evaluate(null)).toStrictEqual([
        { a: 1 },
    ]);
});

test.skip('delpaths(PATHS)', () => {
    expect(
        JQ.compile('delpaths([["a","b"]])').evaluate({
            a: { b: 1 },
            x: { y: 2 },
        })
    ).toStrictEqual([{ a: {}, x: { y: 2 } }]);
});

test('to_entries, from_entries, with_entries', () => {
    expect(JQ.compile('to_entries').evaluate({ a: 1, b: 2 })).toStrictEqual([
        [
            { key: 'a', value: 1 },
            { key: 'b', value: 2 },
        ],
    ]);
});

test('to_entries, from_entries, with_entries', () => {
    expect(
        JQ.compile('from_entries').evaluate([
            { key: 'a', value: 1 },
            { key: 'b', value: 2 },
        ])
    ).toStrictEqual([{ a: 1, b: 2 }]);
});

test.skip('to_entries, from_entries, with_entries', () => {
    expect(
        JQ.compile('with_entries(.key |= "KEY_" + .)').evaluate({ a: 1, b: 2 })
    ).toStrictEqual([{ KEY_a: 1, KEY_b: 2 }]);
});

test('select(boolean_expression)', () => {
    expect(
        JQ.compile('map(select(. >= 2))').evaluate([1, 5, 3, 0, 7])
    ).toStrictEqual([[5, 3, 7]]);
});

test('select(boolean_expression)', () => {
    expect(
        JQ.compile('.[] | select(.id == "second")').evaluate([
            { id: 'first', val: 1 },
            { id: 'second', val: 2 },
        ])
    ).toStrictEqual([{ id: 'second', val: 2 }]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | arrays').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([[]]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | objects').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([{}]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | iterables').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([[], {}]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | booleans').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([true, false]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | numbers').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([1]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | normals').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
            Number.NEGATIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            0,
        ])
    ).toStrictEqual([1]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | finites').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
            Number.NEGATIVE_INFINITY,
            Number.POSITIVE_INFINITY,
            0,
        ])
    ).toStrictEqual([1, 0]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | strings').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual(['foo']);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | nulls').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([null]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | values').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([[], {}, 1, 'foo', true, false]);
});

test('arrays, objects, iterables, booleans, numbers, normals, finites, strings, nulls, values, scalars', () => {
    expect(
        JQ.compile('.[] | scalars').evaluate([
            [],
            {},
            1,
            'foo',
            null,
            true,
            false,
        ])
    ).toStrictEqual([1, 'foo', null, true, false]);
});

test('empty', () => {
    expect(JQ.compile('1, empty, 2').evaluate(null)).toStrictEqual([1, 2]);
});

test('empty', () => {
    expect(JQ.compile('[1,2,empty,3]').evaluate(null)).toStrictEqual([
        [1, 2, 3],
    ]);
});

test('error(message)', () => {
    expect(() => JQ.compile('error("TEST")').evaluate(null)).toThrowError(
        new RuntimeError('TEST')
    );
});

test.skip('halt', () => {
    expect(JQ.compile('halt').evaluate(null)).toStrictEqual([]);
});

test.skip('halt_error, halt_error(exit_code)', () => {
    expect(JQ.compile('halt_error').evaluate(null)).toStrictEqual([]);
});

test.skip('halt_error, halt_error(exit_code)', () => {
    expect(JQ.compile('halt_error(100)').evaluate(null)).toStrictEqual([]);
});

test.skip('$__loc__', () => {
    expect(JQ.compile('$__loc__').evaluate(null)).toStrictEqual([
        { file: '<top-level>', line: 1 },
    ]);
});

test.skip('$__loc__', () => {
    expect(
        JQ.compile('try error("($__loc__)") catch .').evaluate(null)
    ).toStrictEqual(['{"file":"<top-level>","line":1}']);
});

test.skip('paths, paths(node_filter), leaf_paths', () => {
    expect(JQ.compile('[paths]').evaluate([1, [[], { a: 2 }]])).toStrictEqual([
        [[0], [1], [1, 0], [1, 1], [1, 1, 'a']],
    ]);
});

test.skip('paths, paths(node_filter), leaf_paths', () => {
    expect(
        JQ.compile('[paths(scalars)]').evaluate([1, [[], { a: 2 }]])
    ).toStrictEqual([[[0], [1, 1, 'a']]]);
});

test('add', () => {
    expect(JQ.compile('add').evaluate(['a', 'b', 'c'])).toStrictEqual(['abc']);
});

test('add', () => {
    expect(JQ.compile('add').evaluate([1, 2, 3])).toStrictEqual([6]);
});

test('add', () => {
    expect(JQ.compile('add').evaluate([])).toStrictEqual([null]);
});

test('any, any(condition), any(generator; condition)', () => {
    expect(JQ.compile('any').evaluate([true, false])).toStrictEqual([true]);
});

test('any, any(condition), any(generator; condition)', () => {
    expect(JQ.compile('any').evaluate([false, false])).toStrictEqual([false]);
});

test('any, any(condition), any(generator; condition)', () => {
    expect(JQ.compile('any').evaluate([])).toStrictEqual([false]);
});

test.skip('any, any(condition), any(generator; condition)', () => {
    expect(JQ.compile('any(strings)').evaluate(['a', 1])).toStrictEqual([true]);
});

test.skip('any, any(condition), any(generator; condition)', () => {
    expect(JQ.compile('any(["x",1][]; strings)').evaluate(null)).toStrictEqual([
        true,
    ]);
});

test('all, all(condition), all(generator; condition)', () => {
    expect(JQ.compile('all').evaluate([true, false])).toStrictEqual([false]);
});

test('all, all(condition), all(generator; condition)', () => {
    expect(JQ.compile('all').evaluate([true, true])).toStrictEqual([true]);
});

test('all, all(condition), all(generator; condition)', () => {
    expect(JQ.compile('all').evaluate([])).toStrictEqual([true]);
});

test.skip('all, all(condition), all(generator; condition)', () => {
    expect(JQ.compile('all(strings)').evaluate(['a', 'b'])).toStrictEqual([
        true,
    ]);
});

test.skip('all, all(condition), all(generator; condition)', () => {
    expect(JQ.compile('all(["x",1][]; strings)').evaluate(null)).toStrictEqual([
        true,
    ]);
});

test('flatten, flatten(depth)', () => {
    expect(JQ.compile('flatten').evaluate([1, [2], [[3]]])).toStrictEqual([
        [1, 2, 3],
    ]);
});

test('flatten, flatten(depth)', () => {
    expect(JQ.compile('flatten(1)').evaluate([1, [2], [[3]]])).toStrictEqual([
        [1, 2, [3]],
    ]);
});

test('flatten, flatten(depth)', () => {
    expect(JQ.compile('flatten').evaluate([[]])).toStrictEqual([[]]);
});

test('flatten, flatten(depth)', () => {
    expect(
        JQ.compile('flatten').evaluate([{ foo: 'bar' }, [{ foo: 'baz' }]])
    ).toStrictEqual([[{ foo: 'bar' }, { foo: 'baz' }]]);
});

test('range(upto), range(from;upto) range(from;upto;by)', () => {
    expect(JQ.compile('range(2;4)').evaluate(null)).toStrictEqual([2, 3]);
});

test('range(upto), range(from;upto) range(from;upto;by)', () => {
    expect(JQ.compile('[range(2;4)]').evaluate(null)).toStrictEqual([[2, 3]]);
});

test('range(upto), range(from;upto) range(from;upto;by)', () => {
    expect(JQ.compile('range(4)').evaluate(null)).toStrictEqual([0, 1, 2, 3]);
});

test('range(upto), range(from;upto) range(from;upto;by)', () => {
    expect(JQ.compile('range(0;10;3)').evaluate(null)).toStrictEqual([
        0, 3, 6, 9,
    ]);
});

test('range(upto), range(from;upto) range(from;upto;by)', () => {
    expect(JQ.compile('[range(0;10;-1)]').evaluate(null)).toStrictEqual([[]]);
});

test('range(upto), range(from;upto) range(from;upto;by)', () => {
    expect(JQ.compile('[range(0;-5;-1)]').evaluate(null)).toStrictEqual([
        [0, -1, -2, -3, -4],
    ]);
});

test('floor', () => {
    expect(JQ.compile('floor').evaluate(3.14159)).toStrictEqual([3]);
});

test('sqrt', () => {
    expect(JQ.compile('sqrt').evaluate(9)).toStrictEqual([3]);
});

test('tonumber', () => {
    expect(JQ.compile('.[] | tonumber').evaluate([1, '1'])).toStrictEqual([
        1, 1,
    ]);
});

test('tostring', () => {
    expect(JQ.compile('.[] | tostring').evaluate([1, '1', [1]])).toStrictEqual([
        '1',
        '1',
        '[1]',
    ]);
});

test('type', () => {
    expect(
        JQ.compile('map(type)').evaluate([0, false, [], {}, null, 'hello'])
    ).toStrictEqual([
        ['number', 'boolean', 'array', 'object', 'null', 'string'],
    ]);
});

test('infinite, nan, isinfinite, isnan, isfinite, isnormal', () => {
    expect(
        JQ.compile('.[] | (infinite * .) < 0').evaluate([-1, 1])
    ).toStrictEqual([true, false]);
});

test('infinite, nan, isinfinite, isnan, isfinite, isnormal', () => {
    expect(JQ.compile('infinite, nan | type').evaluate(null)).toStrictEqual([
        'number',
        'number',
    ]);
});

test('sort, sort_by(path_expression)', () => {
    expect(JQ.compile('sort').evaluate([8, 3, null, 6])).toStrictEqual([
        [null, 3, 6, 8],
    ]);
});

test('sort, sort_by(path_expression)', () => {
    expect(
        JQ.compile('sort_by(.foo)').evaluate([
            { foo: 4, bar: 10 },
            { foo: 3, bar: 100 },
            { foo: 2, bar: 1 },
        ])
    ).toStrictEqual([
        [
            { foo: 2, bar: 1 },
            { foo: 3, bar: 100 },
            { foo: 4, bar: 10 },
        ],
    ]);
});

test('group_by(path_expression)', () => {
    expect(
        JQ.compile('group_by(.foo)').evaluate([
            { foo: 1, bar: 10 },
            { foo: 3, bar: 100 },
            { foo: 1, bar: 1 },
        ])
    ).toStrictEqual([
        [
            [
                { foo: 1, bar: 10 },
                { foo: 1, bar: 1 },
            ],
            [{ foo: 3, bar: 100 }],
        ],
    ]);
});

test('min, max, min_by(path_exp), max_by(path_exp)', () => {
    expect(JQ.compile('min').evaluate([5, 4, 2, 7])).toStrictEqual([2]);
});

test('min, max, min_by(path_exp), max_by(path_exp)', () => {
    expect(JQ.compile('max').evaluate([5, 4, 2, 7])).toStrictEqual([7]);
});

test('min, max, min_by(path_exp), max_by(path_exp)', () => {
    expect(
        JQ.compile('min_by(.foo)').evaluate([
            { foo: 1, bar: 14 },
            { foo: 2, bar: 3 },
        ])
    ).toStrictEqual([{ foo: 1, bar: 14 }]);
});

test('min, max, min_by(path_exp), max_by(path_exp)', () => {
    expect(
        JQ.compile('max_by(.foo)').evaluate([
            { foo: 1, bar: 14 },
            { foo: 2, bar: 3 },
        ])
    ).toStrictEqual([{ foo: 2, bar: 3 }]);
});

test('unique, unique_by(path_exp)', () => {
    expect(
        JQ.compile('unique').evaluate([1, 2, 5, 3, 5, 3, 1, 3])
    ).toStrictEqual([[1, 2, 3, 5]]);
});

test('unique, unique_by(path_exp)', () => {
    expect(
        JQ.compile('unique_by(.foo)').evaluate([
            { foo: 1, bar: 2 },
            { foo: 1, bar: 3 },
            { foo: 4, bar: 5 },
        ])
    ).toStrictEqual([
        [
            { foo: 1, bar: 2 },
            { foo: 4, bar: 5 },
        ],
    ]);
});

test('unique, unique_by(path_exp)', () => {
    expect(
        JQ.compile('unique_by(length)').evaluate([
            'chunky',
            'bacon',
            'kitten',
            'cicada',
            'asparagus',
        ])
    ).toStrictEqual([['bacon', 'chunky', 'asparagus']]);
});

test('reverse', () => {
    expect(JQ.compile('reverse').evaluate([1, 2, 3, 4])).toStrictEqual([
        [4, 3, 2, 1],
    ]);
});

test('contains(element)', () => {
    expect(JQ.compile('contains("bar")').evaluate('foobar')).toStrictEqual([
        true,
    ]);
});

test('contains(element)', () => {
    expect(
        JQ.compile('contains(["baz", "bar"])').evaluate([
            'foobar',
            'foobaz',
            'blarp',
        ])
    ).toStrictEqual([true]);
});

test('contains(element)', () => {
    expect(
        JQ.compile('contains(["bazzzzz", "bar"])').evaluate([
            'foobar',
            'foobaz',
            'blarp',
        ])
    ).toStrictEqual([false]);
});

test('contains(element)', () => {
    expect(
        JQ.compile('contains({foo: 12, bar: [{barp: 12}]})').evaluate({
            foo: 12,
            bar: [1, 2, { barp: 12, blip: 13 }],
        })
    ).toStrictEqual([true]);
});

test('contains(element)', () => {
    expect(
        JQ.compile('contains({foo: 12, bar: [{barp: 15}]})').evaluate({
            foo: 12,
            bar: [1, 2, { barp: 12, blip: 13 }],
        })
    ).toStrictEqual([false]);
});

test('indices(s)', () => {
    expect(
        JQ.compile('indices(", ")').evaluate('a,b, cd, efg, hijk')
    ).toStrictEqual([[3, 7, 12]]);
});

test('indices(s)', () => {
    expect(
        JQ.compile('indices(1)').evaluate([0, 1, 2, 1, 3, 1, 4])
    ).toStrictEqual([[1, 3, 5]]);
});

test('indices(s)', () => {
    expect(
        JQ.compile('indices([1,2])').evaluate([
            0, 1, 2, 3, 1, 4, 2, 5, 1, 2, 6, 7,
        ])
    ).toStrictEqual([[1, 8]]);
});

test('indices(s)', () => {
    expect(
        JQ.compile('indices([1,3])').evaluate([1, 3, 1, 3, 1])
    ).toStrictEqual([[0, 2]]);
});

test('index(s), rindex(s)', () => {
    expect(
        JQ.compile('index(", ")').evaluate('a,b, cd, efg, hijk')
    ).toStrictEqual([3]);
});

test('index(s), rindex(s)', () => {
    expect(
        JQ.compile('rindex(", ")').evaluate('a,b, cd, efg, hijk')
    ).toStrictEqual([12]);
});

test('inside', () => {
    expect(JQ.compile('inside("foobar")').evaluate('bar')).toStrictEqual([
        true,
    ]);
});

test('inside', () => {
    expect(
        JQ.compile('inside(["foobar", "foobaz", "blarp"])').evaluate([
            'baz',
            'bar',
        ])
    ).toStrictEqual([true]);
});

test('inside', () => {
    expect(
        JQ.compile('inside(["foobar", "foobaz", "blarp"])').evaluate([
            'bazzzzz',
            'bar',
        ])
    ).toStrictEqual([false]);
});

test('inside', () => {
    expect(
        JQ.compile(
            'inside({"foo": 12, "bar":[1,2,{"barp":12, "blip":13}]})'
        ).evaluate({ foo: 12, bar: [{ barp: 12 }] })
    ).toStrictEqual([true]);
});

test('inside', () => {
    expect(
        JQ.compile(
            'inside({"foo": 12, "bar":[1,2,{"barp":12, "blip":13}]})'
        ).evaluate({ foo: 12, bar: [{ barp: 15 }] })
    ).toStrictEqual([false]);
});

test('startswith(str)', () => {
    expect(
        JQ.compile('[.[]|startswith("foo")]').evaluate([
            'fo',
            'foo',
            'barfoo',
            'foobar',
            'barfoob',
        ])
    ).toStrictEqual([[false, true, false, true, false]]);
});

test('endswith(str)', () => {
    expect(
        JQ.compile('[.[]|endswith("foo")]').evaluate(['foobar', 'barfoo'])
    ).toStrictEqual([[false, true]]);
});

test('combinations, combinations(n)', () => {
    expect(
        JQ.compile('combinations').evaluate([
            [1, 2],
            [3, 4],
        ])
    ).toStrictEqual([
        [1, 3],
        [1, 4],
        [2, 3],
        [2, 4],
    ]);
});

test('combinations, combinations(n)', () => {
    expect(
        JQ.compile('combinations').evaluate([
            [1, 2],
            [3, 4, 5],
        ])
    ).toStrictEqual([
        [1, 3],
        [1, 4],
        [1, 5],
        [2, 3],
        [2, 4],
        [2, 5],
    ]);
});

test('combinations, combinations(n)', () => {
    expect(
        JQ.compile('combinations').evaluate([
            [1, 2],
            [3, 4],
            [5, 6],
        ])
    ).toStrictEqual([
        [1, 3, 5],
        [1, 3, 6],
        [1, 4, 5],
        [1, 4, 6],
        [2, 3, 5],
        [2, 3, 6],
        [2, 4, 5],
        [2, 4, 6],
    ]);
});

test('combinations, combinations(n)', () => {
    expect(JQ.compile('combinations').evaluate([[1, 2], []])).toStrictEqual([]);
});

test('combinations, combinations(n)', () => {
    expect(JQ.compile('combinations(2)').evaluate([0, 1])).toStrictEqual([
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
    ]);
});

test('combinations, combinations(n)', () => {
    expect(JQ.compile('combinations(2)').evaluate([0, 1, 2])).toStrictEqual([
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
    ]);
});

test('combinations, combinations(n)', () => {
    expect(JQ.compile('combinations(3)').evaluate([0, 1])).toStrictEqual([
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 0],
        [0, 1, 1],
        [1, 0, 0],
        [1, 0, 1],
        [1, 1, 0],
        [1, 1, 1],
    ]);
});

test('combinations, combinations(n)', () => {
    expect(JQ.compile('combinations(0)').evaluate([0, 1])).toStrictEqual([]);
});

test('object value specifier which containing filters', () => {
    expect(
        JQ.compile('{ x: .ys[] | {a} | {b: 1 - .a} }').evaluate({
            ys: [{ a: 1 }, { a: 2 }],
        })
    ).toStrictEqual([
        {
            x: {
                b: 0,
            },
        },
        {
            x: {
                b: -1,
            },
        },
    ]);
});
