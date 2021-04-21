export class Stats {
  unknown: number;
  accuracy: number;
  assists: number;
  eliminations: number;
  weaponDamage: number;
  otherDamage: number;
  revives: number;
  damageTaken: number;
  damageStructures: number;
  materialsGathered: number;
  materialsUsed: number;
  totalTraveled: number;

  constructor(
    unknown: number,
    accuracy: number,
    assists: number,
    eliminations: number,
    weaponDamage: number,
    otherDamage: number,
    revives: number,
    damageTaken: number,
    damageStructures: number,
    materialsGathered: number,
    materialsUsed: number,
    totalTraveled: number
  ) {
    this.unknown = unknown;
    this.accuracy = accuracy;
    this.assists = assists;
    this.eliminations = eliminations;
    this.weaponDamage = weaponDamage;
    this.otherDamage = otherDamage;
    this.revives = revives;
    this.damageTaken = damageTaken;
    this.damageStructures = damageStructures;
    this.materialsGathered = materialsGathered;
    this.materialsUsed = materialsUsed;
    this.totalTraveled = totalTraveled;
  }
}
