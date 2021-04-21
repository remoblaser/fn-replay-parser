import crypto from "crypto";
import { ChunkType } from "./enums/ChunkType";
import { EventType } from "./enums/EvenType";
import { HeaderType } from "./enums/HeaderType";
import { HistoryType } from "./enums/HistoryType";
import { PlayerType } from "./enums/PlayerType";
import { Replay } from "./FortniteReplay";
import { Elimination } from "./models/Elimination";
import { PlayerId } from "./models/PlayerId";
import { ReplayHeader } from "./models/ReplayHeader";
import { ReplayMeta } from "./models/ReplayMeta";
import { Stats } from "./models/Stats";
import { TeamStats } from "./models/TeamStats";

const FILE_MAGIC_NUMBER = 480436863;
const NETWORK_MAGIC_NUMBER = 754295101;

export class FortniteReplayParser {
  private replay: Replay;
  private isEncrypted = false;
  private encryptionKey?: Buffer;

  replayMeta?: ReplayMeta;
  header?: ReplayHeader;
  teamStats: Array<TeamStats> = [];
  matchStats: Array<Stats> = [];
  eliminations: Array<Elimination> = [];

  constructor(file: Buffer) {
    this.replay = new Replay(file);
  }

  parse() {
    const magic = this.replay.readUint32();
    if (magic !== FILE_MAGIC_NUMBER) {
      throw new Error("Invalid replay");
    }

    const fileVersion = this.replay.readUint32();
    const lengthInMs = this.replay.readUint32();
    const networkVersion = this.replay.readUint32();
    const changeList = this.replay.readUint32();
    const friendlyName = this.replay.readString();
    const isLive = this.replay.readBoolean();

    let timestamp = null;
    if (fileVersion >= HistoryType.HISTORY_RECORDED_TIMESTAMP) {
      timestamp = this.replay.readUInt64();
    }

    let isCompressed = false;
    if (fileVersion >= HistoryType.HISTORY_COMPRESSION) {
      isCompressed = this.replay.readBoolean();
    }

    if (fileVersion >= HistoryType.HISTORY_ENCRYPTION) {
      this.isEncrypted = this.replay.readBoolean();
      const encryptionKeySize = this.replay.readUint32();
      this.encryptionKey = this.replay.readBytes(encryptionKeySize);
    }

    if (!isLive && this.isEncrypted && this.encryptionKey?.length === 0) {
      throw new Error("Replay is marked encrypted but has no key");
    }
    if (isLive && this.isEncrypted) {
      throw new Error(
        "Replay is marked encrypted but not yet marked as finished"
      );
    }

    this.replayMeta = new ReplayMeta(
      fileVersion,
      lengthInMs,
      networkVersion,
      changeList,
      friendlyName,
      isLive,
      timestamp,
      isCompressed,
      this.isEncrypted,
      this.encryptionKey
    );

    while (this.replay.bytePosition < this.replay.buffer.length) {
      const chunkType = this.replay.readUint32();
      const chunkSize = this.replay.readUint32();
      const offset = this.replay.bytePosition;
      switch (chunkType) {
        case ChunkType.CHECKPOINT:
          break;
        case ChunkType.EVENT:
          this.parseEvent(this.replay);
          break;
        case ChunkType.REPLAYDATA:
          break;
        case ChunkType.HEADER:
          this.parseHeader();
          break;
      }
      this.replay.bytePosition = offset + chunkSize;
    }
  }

  private parseHeader() {
    const networkMagic = this.replay.readUint32();
    if (networkMagic !== NETWORK_MAGIC_NUMBER) {
      throw new Error("Invalid replay");
    }
    const networkVersion = this.replay.readUint32();
    const networkChecksum = this.replay.readUint32();
    const engineNetworkVersion = this.replay.readUint32();
    const gameNetworkProtocol = this.replay.readUint32();

    let guid = "";
    if (networkVersion > HeaderType.HISTORY_HEADER_GUID) {
      guid = this.replay.readGuid();
    }

    const major = this.replay.readUint16();
    const minor = this.replay.readUint16();
    const patch = this.replay.readUint16();

    const changeList = this.replay.readUint32();
    const branch = this.replay.readString();

    const levelNamesAndTimes = this.replay
      .readTuple()
      .map((o) => ({ name: o.key, time: o.value }));
    const flags = this.replay.readUint32();
    const gameSpecificData = this.replay.readArray();

    this.header = new ReplayHeader(
      networkVersion,
      networkChecksum,
      engineNetworkVersion,
      gameNetworkProtocol,
      guid,
      major,
      minor,
      patch,
      changeList,
      branch,
      levelNamesAndTimes,
      flags,
      gameSpecificData
    );
  }
  private parseEvent(tempReplay: Replay) {
    const eventId = tempReplay.readString();
    const group = tempReplay.readString();
    const metaData = tempReplay.readString();
    const startTime = tempReplay.readUint32();
    const endTime = tempReplay.readUint32();
    const size = tempReplay.readUint32();
    const decryptedReplay = this.decryptBuffer(size);
    if (group === EventType.PLAYER_ELIMINATION) {
      this.parseEliminationEvent(decryptedReplay, startTime);
    }
    if (metaData === EventType.MATCH_STATS) {
      this.parseMatchStatsEvent(decryptedReplay);
    }
    if (metaData === EventType.TEAM_STATS) {
      this.parseTeamStatsEvent(decryptedReplay);
    }
  }

  private parseEliminationEvent(decryptedReplay: Replay, timestamp: number) {
    if (!this.header || !this.header.version) return;
    let eliminated;
    let eliminator;
    if (
      this.header.engineNetworkVersion >= 11 &&
      Number(this.header.version["major"]) >= 9
    ) {
      decryptedReplay.skip(85);
      eliminated = this.readPlayer(decryptedReplay);
      eliminator = this.readPlayer(decryptedReplay);
    } else {
      if (this.header.branch === "++Fortnite+Release-4.0") {
        decryptedReplay.skip(12);
      } else if (this.header.branch === "++Fortnite+Release-4.2") {
        decryptedReplay.skip(40);
      } else if (this.header.branch >= "++Fortnite+Release-4.3") {
        decryptedReplay.skip(45);
      } else if (this.header.branch == "++Fortnite+Main") {
        decryptedReplay.skip(45);
      } else {
        console.log("Could not parse Elimination Event");
        return;
      }
      eliminated = new PlayerId("", decryptedReplay.readString(), true);
      eliminator = new PlayerId("", decryptedReplay.readString(), true);
    }
    const gunType = decryptedReplay.readByte();
    const knocked = decryptedReplay.readUint32();

    this.eliminations.push(
      new Elimination(eliminated, eliminator, gunType, timestamp, knocked === 1)
    );
  }

  private readPlayer(decryptedReplay: Replay) {
    const playerType = decryptedReplay.readByte();
    console.log(playerType);
    if (playerType === PlayerType.NAMELESS_BOT) {
      return new PlayerId("Bot", "", false);
    } else if (playerType === PlayerType.NAMED_BOT) {
      return new PlayerId(decryptedReplay.readString(), "", false);
    } else {
      decryptedReplay.skip(1);
      return new PlayerId("", decryptedReplay.readGuid(), true);
    }
  }

  private parseTeamStatsEvent(decryptedReplay: Replay) {
    const unknown = decryptedReplay.readUint32();
    const position = decryptedReplay.readUint32();
    const totalPlayers = decryptedReplay.readUint32();

    this.teamStats.push(new TeamStats(unknown, position, totalPlayers));
  }

  private parseMatchStatsEvent(decryptedReplay: Replay) {
    const unknown = decryptedReplay.readUint32();
    const accuracy = decryptedReplay.readFloat32();
    const assists = decryptedReplay.readUint32();
    const eliminations = decryptedReplay.readUint32();
    const weaponDamage = decryptedReplay.readUint32();
    const otherDamage = decryptedReplay.readUint32();
    const revives = decryptedReplay.readUint32();
    const damageTaken = decryptedReplay.readUint32();
    const damageStructures = decryptedReplay.readUint32();
    const materialsGathered = decryptedReplay.readUint32();
    const materialsUsed = decryptedReplay.readUint32();
    const totalTraveled = decryptedReplay.readUint32();

    this.matchStats.push(
      new Stats(
        unknown,
        accuracy,
        assists,
        eliminations,
        weaponDamage,
        otherDamage,
        revives,
        damageTaken,
        damageStructures,
        materialsGathered,
        materialsUsed,
        totalTraveled
      )
    );
  }

  private parseCheckpoint(replay: Replay) {}

  private parseReplayData(replay: Replay) {}

  private decryptBuffer(size: number): Replay {
    if (!this.isEncrypted || !this.encryptionKey) return this.replay;
    const decipher = crypto.createDecipheriv(
      "aes-256-ecb",
      this.encryptionKey,
      Buffer.alloc(0)
    );
    const encryptedPart = this.replay.readBytes(size);
    return new Replay(
      Buffer.concat([decipher.update(encryptedPart), decipher.final()])
    );
  }
}
