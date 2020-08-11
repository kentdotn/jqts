# jqts

A TypeScript implementation of `jq` query language for JSON

## Install

```sh
npm install jqts
```

## Usage

For TypeScript:

```typescript
import jq from 'jqts';

const pattern = jq.compile('[.[].x]');
pattern.evaluate([{ x: 1, x: 2 }]); // [1, 2]
```

For JavaScript:

```javascript
const jq = require('jqts').default;

const pattern = jq.compile('[.[].x]');
pattern.evaluate([{ x: 1, x: 2 }]); // [1, 2]
```

## Supported Filters

| Filter                                                                                                                                                                                                                                                 | Notation               | Status             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ------------------ |
| [Identity](https://stedolan.github.io/jq/manual/#Identity:.)                                                                                                                                                                                           | `.`                    | :heavy_check_mark: |
| [Object Identifier-Index](https://stedolan.github.io/jq/manual/#ObjectIdentifier-Index:.foo,.foo.bar)                                                                                                                                                  | `.foo` `.foo.bar`      | :heavy_check_mark: |
| [Optional Object Identifier-Index](https://stedolan.github.io/jq/manual/#OptionalObjectIdentifier-Index:.foo?)                                                                                                                                         | `.foo?`                | :heavy_check_mark: |
| [Generic Object Index](https://stedolan.github.io/jq/manual/#GenericObjectIndex:.[%3Cstring%3E])                                                                                                                                                       | `.[<string>]`          | :heavy_check_mark: |
| [Array Index](https://stedolan.github.io/jq/manual/#ArrayIndex:.[2])                                                                                                                                                                                   | `.[2]`                 | :heavy_check_mark: |
| [Array/String Slice](https://stedolan.github.io/jq/manual/#Array/StringSlice:.[10:15])                                                                                                                                                                 | `.[10:15]`             | :heavy_check_mark: |
| [Array/Object Value Iterator](https://stedolan.github.io/jq/manual/#Array/ObjectValueIterator:.[])                                                                                                                                                     | `.[]` `.[]?`           | :heavy_check_mark: |
| [Comma](https://stedolan.github.io/jq/manual/#Comma:,)                                                                                                                                                                                                 | `.foo, .bar`           | :heavy_check_mark: |
| [Pipe](https://stedolan.github.io/jq/manual/#Pipe)                                                                                                                                                                                                     | `.[] | .foo`           | :heavy_check_mark: |
| [Parenthesis](https://stedolan.github.io/jq/manual/#Parenthesis)                                                                                                                                                                                       | `(. + 2) * 5`          | :heavy_check_mark: |
| [JSON datatypes](https://stedolan.github.io/jq/manual/#TypesandValues)                                                                                                                                                                                 |                        | :heavy_check_mark: |
| [Array Construction](https://stedolan.github.io/jq/manual/#Arrayconstruction:[])                                                                                                                                                                       | `[.foo, .bar]`         | :heavy_check_mark: |
| [Object Construction](https://stedolan.github.io/jq/manual/#ObjectConstruction:{})                                                                                                                                                                     | `{foo:.bar}` `{baz}`   | :heavy_check_mark: |
| [Recursive Descent](https://stedolan.github.io/jq/manual/#RecursiveDescent:..)                                                                                                                                                                         | `..`                   |                    |
| [Addition](https://stedolan.github.io/jq/manual/#Addition:+)                                                                                                                                                                                           | `+`                    | :heavy_check_mark: |
| [Subtraction](https://stedolan.github.io/jq/manual/#Subtraction:-)                                                                                                                                                                                     | `-`                    | :heavy_check_mark: |
| [Multiplication,Division,Modulo](https://stedolan.github.io/jq/manual/#Multiplication,division,modulo:*,/,and%)                                                                                                                                        | `*` `/` `%`            | :heavy_check_mark: |
| [`length`](https://stedolan.github.io/jq/manual/#length)                                                                                                                                                                                               | `length`               | :heavy_check_mark: |
| [`utf8bytelength`](https://stedolan.github.io/jq/manual/#utf8bytelength)                                                                                                                                                                               | `utf8bytelength`       | :heavy_check_mark: |
| [`keys`, `keys_unsorted`](https://stedolan.github.io/jq/manual/#keys,keys_unsorted)                                                                                                                                                                    | `keys` `keys_unsorted` | :heavy_check_mark: |
| [`has(key)`](<https://stedolan.github.io/jq/manual/#has(key)>)                                                                                                                                                                                         | `has("foo")`           | :heavy_check_mark: |
| [`in`](https://stedolan.github.io/jq/manual/#in)                                                                                                                                                                                                       | `in([0, 1])`           | :heavy_check_mark: |
| [`map`](<https://stedolan.github.io/jq/manual/#map(x),map_values(x)>)                                                                                                                                                                                  | `map`                  | :heavy_check_mark: |
| [`map_values`](<https://stedolan.github.io/jq/manual/#map(x),map_values(x)>)                                                                                                                                                                           | `map_value`            |                    |
| [`path(path_expression)`](<https://stedolan.github.io/jq/manual/#path(path_expression)>)                                                                                                                                                               |                        |                    |
| [`del(path_expression)`](<https://stedolan.github.io/jq/manual/#del(path_expression)>)                                                                                                                                                                 |                        |                    |
| [`getpath(PATHS)`](<https://stedolan.github.io/jq/manual/#getpath(PATHS)>)                                                                                                                                                                             |                        |                    |
| [`setpath(PATHS; VALUE)`](<https://stedolan.github.io/jq/manual/#setpath(PATHS;VALUE)>)                                                                                                                                                                |                        |                    |
| [`delpaths(PATHS)`](<https://stedolan.github.io/jq/manual/#delpaths(PATHS)>)                                                                                                                                                                           |                        |                    |
| [`to_entries, from_entries`](https://stedolan.github.io/jq/manual/#to_entries,from_entries,with_entries)                                                                                                                                               |                        | :heavy_check_mark: |
| [`with_entries`](https://stedolan.github.io/jq/manual/#to_entries,from_entries,with_entries)                                                                                                                                                           |                        |                    |
| [`select(boolean_expression)`](<https://stedolan.github.io/jq/manual/#select(boolean_expression)>)                                                                                                                                                     |                        | :heavy_check_mark: |
| [`arrays`, `objects`, `iterables`, `booleans`, `numbers`, `normals`, `finites`, `strings`, `nulls`, `values`, `scalars`](https://stedolan.github.io/jq/manual/#arrays,objects,iterables,booleans,numbers,normals,finites,strings,nulls,values,scalars) |                        | :heavy_check_mark: |
| [`empty`](https://stedolan.github.io/jq/manual/#empty)                                                                                                                                                                                                 |                        | :heavy_check_mark: |
| [`error(message)`](<https://stedolan.github.io/jq/manual/#error(message)>)                                                                                                                                                                             |                        | :heavy_check_mark: |
| [`halt`](https://stedolan.github.io/jq/manual/#halt)                                                                                                                                                                                                   |                        |                    |
| [`halt_error`, `halt_error(exit_code)`](<https://stedolan.github.io/jq/manual/#halt_error,halt_error(exit_code)>)                                                                                                                                      |                        |                    |
| [`$__loc__`](https://stedolan.github.io/jq/manual/#$__loc__)                                                                                                                                                                                           |
| [`paths`, `paths(node_filter)`, `leaf_paths`](<https://stedolan.github.io/jq/manual/#paths,paths(node_filter),leaf_paths>)                                                                                                                             |                        |                    |
| [`add`](https://stedolan.github.io/jq/manual/#add)                                                                                                                                                                                                     |                        | :heavy_check_mark: |
| [`any`](<https://stedolan.github.io/jq/manual/#any,any(condition),any(generator;condition)>)                                                                                                                                                           |                        | :heavy_check_mark: |
| [`any(condition)`, `any(generator; condition)`](<https://stedolan.github.io/jq/manual/#any,any(condition),any(generator;condition)>)                                                                                                                   |                        |                    |
| [`all`](<https://stedolan.github.io/jq/manual/#all,all(condition),all(generator;condition)>)                                                                                                                                                           |                        | :heavy_check_mark: |
| [`all(condition)`, `all(generator; condition)`](<https://stedolan.github.io/jq/manual/#all,all(condition),all(generator;condition)>)                                                                                                                   |                        |                    |
| [`flatten`, `flatten(depth)`](<https://stedolan.github.io/jq/manual/#flatten,flatten(depth)>)                                                                                                                                                          |                        | :heavy_check_mark: |
| [`range(upto)`, `range(from;upto)`, `range(from;upto;by)`](<https://stedolan.github.io/jq/manual/#range(upto),range(from;upto)range(from;upto;by)>)                                                                                                    |                        | :heavy_check_mark: |
| [`floor`](https://stedolan.github.io/jq/manual/#floor)                                                                                                                                                                                                 |                        | :heavy_check_mark: |
| [`sqrt`](https://stedolan.github.io/jq/manual/#sqrt)                                                                                                                                                                                                   |                        | :heavy_check_mark: |
| [`tonumber`](https://stedolan.github.io/jq/manual/#tonumber)                                                                                                                                                                                           |                        | :heavy_check_mark: |
| [`tostring`](https://stedolan.github.io/jq/manual/#tostring)                                                                                                                                                                                           |                        | :heavy_check_mark: |
| [`type`](https://stedolan.github.io/jq/manual/#type)                                                                                                                                                                                                   |                        | :heavy_check_mark: |
| [`infinite, nan, isinfinite, isnan, isfinite, isnormal`](https://stedolan.github.io/jq/manual/#infinite,nan,isinfinite,isnan,isfinite,isnormal)                                                                                                        |                        | :heavy_check_mark: |
| [`sort, sort_by(path_expression)`](<https://stedolan.github.io/jq/manual/#sort,sort_by(path_expression)>)                                                                                                                                              |                        | :heavy_check_mark: |
| [`group_by(path_expression)`](<https://stedolan.github.io/jq/manual/#group_by(path_expression)>)                                                                                                                                                       |                        | :heavy_check_mark: |
| [`min`, `max`, `min_by(path_exp)`, `max_by(path_exp)`](https://stedolan.github.io/jq/manual)                                                                                                                                                           |                        | :heavy_check_mark: |
| [`unique, unique_by(path_exp)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                  |                        | :heavy_check_mark: |
| [`reverse`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        | :heavy_check_mark: |
| [`contains(element)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                            |                        | :heavy_check_mark: |
| [`indices(s)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                   |                        | :heavy_check_mark: |
| [`index(s), rindex(s)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                          |                        | :heavy_check_mark: |
| [`inside`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                       |                        | :heavy_check_mark: |
| [`startswith(str)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                              |                        |                    |
| [`endswith(str)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                |                        |                    |
| [`combinations, combinations(n)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                |                        |                    |
| [`ltrimstr(str)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                |                        |                    |
| [`rtrimstr(str)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                |                        |                    |
| [`explode`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        |                    |
| [`implode`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        |                    |
| [`split(str)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                   |                        |                    |
| [`join(str)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                    |                        |                    |
| [`ascii_downcase`, `ascii_upcase`](https://stedolan.github.io/jq/manual)                                                                                                                                                                               |                        |                    |
| [`while(cond; update)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                          |                        |                    |
| [`until(cond; next)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                            |                        |                    |
| [`recurse(f)`, `recurse`, `recurse(f; condition)`, `recurse_down`](https://stedolan.github.io/jq/manual)                                                                                                                                               |                        |                    |
| [`walk(f)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        |                    |
| [`$ENV`, `env`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                  |                        |                    |
| [`transpose`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                    |                        |                    |
| [`bsearch(x)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                   |                        |                    |
| [String interpolation - `\(foo)`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                |                        |                    |
| [Convert to/from JSON](https://stedolan.github.io/jq/manual)                                                                                                                                                                                           |                        |                    |
| [Format strings and escaping](https://stedolan.github.io/jq/manual)                                                                                                                                                                                    |                        |                    |
| [Dates](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                          |                        |                    |
| [SQL-Style Operators](https://stedolan.github.io/jq/manual)                                                                                                                                                                                            |                        |                    |
| [builtins](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                       |                        |                    |
| [`==`, `!=`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                     |                        |                    |
| [if-then-else](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                   |                        |                    |
| [`>`, `>=`, `<=`, `<`](https://stedolan.github.io/jq/manual)                                                                                                                                                                                           |                        |                    |
| [and/or/not](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                     | `and`, `or`, `not`     |                    |
| [Alternative operator](https://stedolan.github.io/jq/manual)                                                                                                                                                                                           | `//`                   |                    |
| [try-catch](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        |                    |
| [Breaking out of control structures](https://stedolan.github.io/jq/manual)                                                                                                                                                                             |                        |                    |
| [Error Suppression / Optional Operator](https://stedolan.github.io/jq/manual)                                                                                                                                                                          | `?`                    |                    |
| [Regular expressions (PCRE)](https://stedolan.github.io/jq/manual)                                                                                                                                                                                     |                        |                    |
| [Variable / Symbolic Binding Operator](https://stedolan.github.io/jq/manual)                                                                                                                                                                           |                        |                    |
| [Destructuring Alternative Operator](https://stedolan.github.io/jq/manual)                                                                                                                                                                             |                        |                    |
| [Defining Functions](https://stedolan.github.io/jq/manual)                                                                                                                                                                                             |                        |                    |
| [Scoping](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                        |                        |                    |
| [Reduce](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                         |                        |                    |
| [Recursion](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        |                    |
| [Generators and Iterators](https://stedolan.github.io/jq/manual)                                                                                                                                                                                       |                        |                    |
| [Math](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                           |                        |                    |
| [I/O](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                            |                        |                    |
| [Streaming](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                      |                        |                    |
| [Assignment](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                     |                        |                    |
| [Modules](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                        |                        |                    |
| [Colors](https://stedolan.github.io/jq/manual)                                                                                                                                                                                                         |                        |                    |

## License

MIT
