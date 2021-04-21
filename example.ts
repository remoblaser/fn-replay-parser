import { readFileSync } from "fs";
import { ReplayParser } from "./index";

const file = readFileSync("path/to/my.replay");
const parser = new ReplayParser(file);

parser.parse();

console.log(parser.replayMeta);
console.log(parser.header);
console.log(parser.matchStats);
console.log(parser.teamStats);
console.log(parser.eliminations);
