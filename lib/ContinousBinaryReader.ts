export class ContinousBinaryReader {
  buffer: Buffer;
  bytePosition = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  skip(count: number) {
    this.bytePosition += count;
  }

  readUint8(): number {
    this.bytePosition += 1;

    return this.buffer.readUInt8(this.bytePosition - 1);
  }

  readUint16(): number {
    this.bytePosition += 2;

    return this.buffer.readUInt16LE(this.bytePosition - 2);
  }

  readUint32(): number {
    this.bytePosition += 4;

    return this.buffer.readUInt32LE(this.bytePosition - 4);
  }

  readInt32(): number {
    this.bytePosition += 4;

    return this.buffer.readInt32LE(this.bytePosition - 4);
  }

  readUInt64(): bigint {
    this.bytePosition += 8;

    return this.buffer.readBigUInt64LE(this.bytePosition - 8);
  }

  readFloat32(): number {
    this.bytePosition += 4;

    return this.buffer.readFloatLE(this.bytePosition - 4);
  }

  readByte() {
    this.bytePosition += 1;

    return this.buffer.readUInt8(this.bytePosition - 1);
  }

  readBytes(length: number): Buffer {
    const result = this.buffer.slice(
      this.bytePosition,
      this.bytePosition + length
    );

    this.bytePosition += length;

    return result;
  }

  readId(): string {
    return this.readBytes(16).toString("hex");
  }

  readBoolean(): boolean {
    return this.readUint32() === 1;
  }

  readGuid(): string {
    return this.readBytes(16).toString("hex");
  }

  readTuple() {
    const length = this.readUint32();
    return Array(length).map((_) => {
      const a = {
        key: this.readString(),
        value: this.readUint32(),
      };
      return a;
    });
  }

  readArray() {
    const length = this.readUint32();
    return Array(length).map((_) => this.readString());
  }

  skipArray() {
    const length = this.readUint32();
    console.log(length);
    this.skip(length);
  }

  readString(): string {
    const length = this.readInt32();

    if (length === 0) {
      return "";
    }
    if (length < 0) {
      return this.readBytes(length * -2)
        .slice(0, -2)
        .toString("utf16le")
        .trim();
    }
    return this.readBytes(length).slice(0, -1).toString("utf-8");
  }
}
