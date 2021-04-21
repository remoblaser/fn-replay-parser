export class ReplayMeta {
  fileVersion: number;
  lenghtInMs: number;
  networkVersion: number;
  changeList: number;
  friendlyName: string;
  isLive: boolean;
  timestamp: bigint | null;
  isCompressed: boolean;
  isEncrypted: boolean;
  encryptionKey?: string;

  constructor(
    fileVersion: number,
    lenghtInMs: number,
    networkVersion: number,
    changeList: number,
    friendlyName: string,
    isLive: boolean,
    timestamp: bigint | null,
    isCompressed: boolean,
    isEncrypted: boolean,
    encryptionKey?: Buffer
  ) {
    this.fileVersion = fileVersion;
    this.lenghtInMs = lenghtInMs;
    this.networkVersion = networkVersion;
    this.changeList = changeList;
    this.friendlyName = friendlyName;
    this.isLive = isLive;
    this.timestamp = timestamp;
    this.isCompressed = isCompressed;
    this.isEncrypted = isEncrypted;
    this.encryptionKey = encryptionKey?.toString("hex");
  }
}
