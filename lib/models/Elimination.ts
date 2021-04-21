import { PlayerId } from "./PlayerId";

export class Elimination {
  eliminated: PlayerId;
  eliminator: PlayerId;
  gunType: number;
  timestamp: number;
  knocked: boolean;

  constructor(
    eliminated: PlayerId,
    eliminator: PlayerId,
    gunType: number,
    timestamp: number,
    knocked: boolean
  ) {
    this.eliminated = eliminated;
    this.eliminator = eliminator;
    this.gunType = gunType;
    this.timestamp = timestamp;
    this.knocked = knocked;
  }
}
