import { Elimination } from "./models/Elimination";
import { PlayerStats } from "./models/PlayerStats";
import { ReplayHeader } from "./models/ReplayHeader";
import { ReplayMeta } from "./models/ReplayMeta";
import { TeamStats } from "./models/TeamStats";

export class FortniteReplay {
  replayMeta?: ReplayMeta;
  header?: ReplayHeader;
  teamStats: Array<TeamStats> = [];
  playerStats: Array<PlayerStats> = [];
  eliminations: Array<Elimination> = [];

  setReplayMeta(replayMeta: ReplayMeta) {
    this.replayMeta = replayMeta;
  }

  setHeader(header: ReplayHeader) {
    this.header = header;
  }

  addTeamStats(teamStats: TeamStats) {
    this.teamStats.push(teamStats);
  }

  addPlayerStats(playerStats: PlayerStats) {
    this.playerStats.push(playerStats);
  }

  addElimination(elimination: Elimination) {
    this.eliminations.push(elimination);
  }
}
