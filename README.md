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

const pattern = jq.compile('[].[].x]');
pattern.evaluate([{ x: 1, x: 2 }]); // [1, 2]
```

For JavaScript:

```javascript
const jq = require('jqts').default;

const pattern = jq.compile('[].[].x]');
pattern.evaluate([{ x: 1, x: 2 }]); // [1, 2]
```

## License

MIT
