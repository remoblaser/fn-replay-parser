# Fortnite Replay Parser

Library to parse Fortnite replays.

```ts
import { readFileSync } from "fs";
import { FortniteReplayParser } from "fn-replay-parser";

const file = readFileSync("path/to/my.replay");
const parser = new FortniteReplayParser(file);

const replay = parser.parse();

console.log(replay.replayMeta);
console.log(replay.header);
console.log(replay.playerStats);
console.log(replay.teamStats);
console.log(replay.eliminations);
```
