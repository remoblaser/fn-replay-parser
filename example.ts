import { readFileSync } from "fs";
import { FortniteReplayParser } from "./index";

const file = readFileSync("./replays/test2.replay");
const parser = new FortniteReplayParser(file);

const replay = parser.parse();

console.log(replay.replayMeta);
console.log(replay.header);
console.log(replay.playerStats);
console.log(replay.teamStats);
console.log(replay.eliminations);
