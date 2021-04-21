# Fortnite Replay Parser

Library to parse Fortnite replays.

See example.ts.

```ts
import { readFileSync } from "fs";
import { FortniteReplayParser } from "fn-replay-parser";

const file = readFileSync("path/to/my.replay");
const parser = new FortniteReplayParser(file);

parser.parse();

console.log(parser.replayMeta);
console.log(parser.header);
console.log(parser.matchStats);
console.log(parser.teamStats);
console.log(parser.eliminations);
```
