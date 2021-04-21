export class ReplayHeader {
  networkVersion: number;
  networkChecksum: number;
  engineNetworkVersion: number;
  gameNetworkProtocol: number;
  guid: string;
  major: number;
  minor: number;
  patch: number;
  changelist: number;
  branch: string;
  levelNamesAndTimes: Array<{ name: string; time: number }>;
  flags: number;
  gameSpecificData: Array<string>;

  constructor(
    networkVersion: number,
    networkChecksum: number,
    engineNetworkVersion: number,
    gameNetworkProtocol: number,
    guid: string,
    major: number,
    minor: number,
    patch: number,
    changelist: number,
    branch: string,
    levelNamesAndTimes: Array<{ name: string; time: number }>,
    flags: number,
    gameSpecificData: Array<string>
  ) {
    this.networkVersion = networkVersion;
    this.networkChecksum = networkChecksum;
    this.engineNetworkVersion = engineNetworkVersion;
    this.gameNetworkProtocol = gameNetworkProtocol;
    this.guid = guid;
    this.major = major;
    this.minor = minor;
    this.patch = patch;
    this.changelist = changelist;
    this.branch = branch;
    this.levelNamesAndTimes = levelNamesAndTimes;
    this.flags = flags;
    this.gameSpecificData = gameSpecificData;
  }

  get version() {
    const regex = /\+\+Fortnite\+Release\-(?<major>\d+)\.(?<minor>\d+)/;
    const match = this.branch.match(regex);
    if (match) {
      return match.groups;
    }
  }
}
