import crypto from "crypto";
import { ContinousBinaryReader } from "./ContinousBinaryReader";
import { ChunkType } from "./enums/ChunkType";
import { EventType } from "./enums/EvenType";
import { HeaderType } from "./enums/HeaderType";
import { HistoryType } from "./enums/HistoryType";
import { PlayerType } from "./enums/PlayerType";
import { EliminationNotParseableException } from "./exceptions/EliminationNotParseableException";
import { FortniteReplay } from "./FortniteReplay";
import { Elimination } from "./models/Elimination";
import { PlayerId } from "./models/PlayerId";
import { PlayerStats } from "./models/PlayerStats";
import { ReplayHeader } from "./models/ReplayHeader";
import { ReplayMeta } from "./models/ReplayMeta";
import { TeamStats } from "./models/TeamStats";

const FILE_MAGIC_NUMBER = 480436863;
const NETWORK_MAGIC_NUMBER = 754295101;

export class FortniteReplayParser {
  private reader: ContinousBinaryReader;
  private fortniteReplay: FortniteReplay;

  constructor(file: Buffer) {
    this.reader = new ContinousBinaryReader(file);
    this.fortniteReplay = new FortniteReplay();
  }

  parse(): FortniteReplay {
    const magic = this.reader.readUint32();
    if (magic !== FILE_MAGIC_NUMBER) {
      throw new Error("Invalid replay");
    }

    const fileVersion = this.reader.readUint32();
    const lengthInMs = this.reader.readUint32();
    const networkVersion = this.reader.readUint32();
    const changeList = this.reader.readUint32();
    const friendlyName = this.reader.readString();
    const isLive = this.reader.readBoolean();

    let timestamp = null;
    if (fileVersion >= HistoryType.HISTORY_RECORDED_TIMESTAMP) {
      timestamp = this.reader.readUInt64();
    }

    let isCompressed = false;
    if (fileVersion >= HistoryType.HISTORY_COMPRESSION) {
      isCompressed = this.reader.readBoolean();
    }
    let isEncrypted = false;
    let encryptionKey = Buffer.alloc(0);
    if (fileVersion >= HistoryType.HISTORY_ENCRYPTION) {
      isEncrypted = this.reader.readBoolean();
      const encryptionKeySize = this.reader.readUint32();
      encryptionKey = this.reader.readBytes(encryptionKeySize);
    }

    if (!isLive && isEncrypted && encryptionKey.length === 0) {
      throw new Error("Replay is marked encrypted but has no key");
    }
    if (isLive && isEncrypted) {
      throw new Error(
        "Replay is marked encrypted but not yet marked as finished"
      );
    }

    const meta = new ReplayMeta(
      fileVersion,
      lengthInMs,
      networkVersion,
      changeList,
      friendlyName,
      isLive,
      timestamp,
      isCompressed,
      isEncrypted,
      encryptionKey
    );
    this.fortniteReplay.setReplayMeta(meta);

    while (this.reader.bytePosition < this.reader.buffer.length) {
      const chunkType = this.reader.readUint32();
      const chunkSize = this.reader.readUint32();
      const offset = this.reader.bytePosition;
      switch (chunkType) {
        case ChunkType.CHECKPOINT:
          break;
        case ChunkType.EVENT:
          this.parseEvent(this.reader);
          break;
        case ChunkType.REPLAYDATA:
          break;
        case ChunkType.HEADER:
          this.parseHeader();
          break;
      }
      this.reader.bytePosition = offset + chunkSize;
    }

    return this.fortniteReplay;
  }

  private parseHeader() {
    const networkMagic = this.reader.readUint32();
    if (networkMagic !== NETWORK_MAGIC_NUMBER) {
      throw new Error("Invalid replay");
    }
    const networkVersion = this.reader.readUint32();
    const networkChecksum = this.reader.readUint32();
    const engineNetworkVersion = this.reader.readUint32();
    const gameNetworkProtocol = this.reader.readUint32();

    let guid = "";
    if (networkVersion > HeaderType.HISTORY_HEADER_GUID) {
      guid = this.reader.readGuid();
    }

    const major = this.reader.readUint16();
    const minor = this.reader.readUint16();
    const patch = this.reader.readUint16();

    const changeList = this.reader.readUint32();
    const branch = this.reader.readString();
    const levelNamesAndTimes = this.reader
      .readTuple()
      .map((o) => ({ name: o.key, time: o.value }));
    const flags = this.reader.readUint32();
    this.reader.skipArray();

    const header = new ReplayHeader(
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
      flags
    );
    this.fortniteReplay.setHeader(header);
  }

  private parseEvent(tempReader: ContinousBinaryReader) {
    const eventId = tempReader.readString();
    const group = tempReader.readString();
    const metaData = tempReader.readString();
    const startTime = tempReader.readUint32();
    const endTime = tempReader.readUint32();
    const size = tempReader.readUint32();
    const decryptedReplay = this.decryptBuffer(size);
    if (group === EventType.PLAYER_ELIMINATION) {
      try {
        this.parseEliminationEvent(decryptedReplay, startTime);
      } catch (e) {
        console.log(e.message);
      }
    }
    if (metaData === EventType.MATCH_STATS) {
      this.parseMatchStatsEvent(decryptedReplay);
    }
    if (metaData === EventType.TEAM_STATS) {
      this.parseTeamStatsEvent(decryptedReplay);
    }
  }

  private parseEliminationEvent(
    decryptedReader: ContinousBinaryReader,
    timestamp: number
  ) {
    const header = this.fortniteReplay.header;
    if (!header || !header.version) return;
    let eliminated;
    let eliminator;
    if (
      header.engineNetworkVersion >= 11 &&
      Number(header.version["major"]) >= 9
    ) {
      decryptedReader.skip(85);
      eliminated = this.readPlayer(decryptedReader);
      eliminator = this.readPlayer(decryptedReader);
    } else {
      if (header.branch === "++Fortnite+Release-4.0") {
        decryptedReader.skip(12);
      } else if (header.branch === "++Fortnite+Release-4.2") {
        decryptedReader.skip(40);
      } else if (header.branch >= "++Fortnite+Release-4.3") {
        decryptedReader.skip(45);
      } else if (header.branch == "++Fortnite+Main") {
        decryptedReader.skip(45);
      } else {
        throw new EliminationNotParseableException();
      }
      eliminated = new PlayerId("", decryptedReader.readString(), true);
      eliminator = new PlayerId("", decryptedReader.readString(), true);
    }
    const gunType = decryptedReader.readByte();
    const knocked = decryptedReader.readUint32();

    const elimination = new Elimination(
      eliminated,
      eliminator,
      gunType,
      timestamp,
      knocked === 1
    );

    this.fortniteReplay.addElimination(elimination);
  }

  private readPlayer(decryptedReader: ContinousBinaryReader) {
    const playerType = decryptedReader.readByte();
    if (playerType === PlayerType.NAMELESS_BOT) {
      return new PlayerId("Bot", "", false);
    } else if (playerType === PlayerType.NAMED_BOT) {
      return new PlayerId(decryptedReader.readString(), "", false);
    } else {
      decryptedReader.skip(1);
      return new PlayerId("", decryptedReader.readGuid(), true);
    }
  }

  private parseTeamStatsEvent(decryptedReader: ContinousBinaryReader) {
    const unknown = decryptedReader.readUint32();
    const position = decryptedReader.readUint32();
    const totalPlayers = decryptedReader.readUint32();

    const teamStats = new TeamStats(unknown, position, totalPlayers);
    this.fortniteReplay.addTeamStats(teamStats);
  }

  private parseMatchStatsEvent(decryptedReader: ContinousBinaryReader) {
    const unknown = decryptedReader.readUint32();
    const accuracy = decryptedReader.readFloat32();
    const assists = decryptedReader.readUint32();
    const eliminations = decryptedReader.readUint32();
    const weaponDamage = decryptedReader.readUint32();
    const otherDamage = decryptedReader.readUint32();
    const revives = decryptedReader.readUint32();
    const damageTaken = decryptedReader.readUint32();
    const damageStructures = decryptedReader.readUint32();
    const materialsGathered = decryptedReader.readUint32();
    const materialsUsed = decryptedReader.readUint32();
    const totalTraveled = decryptedReader.readUint32();

    const playerStats = new PlayerStats(
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
    );
    this.fortniteReplay.addPlayerStats(playerStats);
  }

  private decryptBuffer(size: number): ContinousBinaryReader {
    const meta = this.fortniteReplay.replayMeta;
    if (!meta || !meta.isEncrypted || !meta.encryptionKey) {
      return this.reader;
    }
    console.log(meta.encryptionKey);
    const decipher = crypto.createDecipheriv(
      "aes-256-ecb",
      meta.encryptionKey,
      Buffer.alloc(0)
    );
    const encryptedPart = this.reader.readBytes(size);

    return new ContinousBinaryReader(
      Buffer.concat([decipher.update(encryptedPart), decipher.final()])
    );
  }
}
