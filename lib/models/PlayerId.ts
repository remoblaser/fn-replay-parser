export class PlayerId {
  name: string;
  guid: string;
  isPlayer: boolean;

  constructor(name: string, guid: string, isPlayer: boolean) {
    this.name = name;
    this.guid = guid;
    this.isPlayer = isPlayer;
  }
}
