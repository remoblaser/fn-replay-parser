export class TeamStats {
  unknown: number;
  position: number;
  totalPlayers: number;

  constructor(unknown: number, position: number, totalPlayers: number) {
    this.unknown = unknown;
    this.position = position;
    this.totalPlayers = totalPlayers;
  }
}
