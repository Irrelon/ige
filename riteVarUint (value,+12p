const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Writes values into a growing byte buffer a bit at a time (most-significant
 * bit first), for the replication layer's compact binary messages: a boolean
 * costs one bit, a quantised number only as many as its range needs.
 * Reusable: reset() empties it without allocating again.
 */
export class IgeNetBitWriter {
	_buf: Uint8Array;
	/** The next bit to write. */
	_pos = 0;

	constructor (size = 1024) {
		this._buf = new Uint8Array(size);
	}

	/** Bits written so far. */
	get bitLength (): number {
		return this._pos;
	}

	/** The buffer's bytes (valid up to `(bitLength + 7) >> 3`); changes when it grows. */
	get buffer (): Uint8Array {
		return this._buf;
	}

	reset (): void {
		this._buf.fill(0, 0, (this._pos + 7) >> 3);
		this._pos = 0;
	}

	_ensure (bits: number): void {
		const need = (this._pos + bits + 7) >> 3;
		if (need <= this._buf.length) return;
		const grown = new Uint8Array(Math.max(need, this._buf.length * 2));
		grown.set(this._buf);
		this._buf = grown;
	}

	/** Writes the low `bits` (1 to 32) of an unsigned integer. */
	writeBits (value: number, bits: number): void {
		if (bits <= 0) return;
		this._ensure(bits);
		const buf = this._buf;
		let pos = this._pos;
		this._pos += bits;
		let remaining = bits;
		while (remaining > 0) {
			const space = 8 - (pos & 7);
			const take = remaining < space ? remaining : space;
			remaining -= take;
			buf[pos >> 3] |= ((value >>> remaining) & ((1 << take) - 1)) << (space - take);
			pos += take;
		}
	}

	writeBool (value: boolean): void {
		this.writeBits(value ? 1 : 0, 1);
	}

	/** An unsigned integer (up to 2^53) in 7-bit groups, small numbers in one byte. */
	writeVarUint (value: number): void {
		while (value >= 128) {
			this.writeBits((value % 128) | 128, 8);
			value = Math.floor(value / 128);
		}
		this.writeBits(value, 8);
	}

	/** A signed integer, zigzag mapped so small magnitudes of either sign stay small. */
	writeVarInt (value: number): void {
		this.writeVarUint(value >= 0 ? value * 2 : -value * 2 - 1);
	}

	writeFloat32 (value: number): void {
		scratch32[0] = value;
		this.writeBits(scratchU32[0], 32);
	}

	/** A string as UTF-8, its byte length first. */
	writeString (value: string): void {
		const bytes = textEncoder.encode(value);
		this.writeVarUint(bytes.length);
		for (let i = 0; i < bytes.length; i++) this.writeBits(bytes[i], 8);
	}

	/** Skips to the next byte boundary. */
	align (): void {
		this._ensure(8);
		this._pos = (this._pos + 7) & ~7;
	}

	/** Appends `bits` bits that start at a byte boundary in another buffer. */
	writeBitsFrom (source: Uint8Array, byteStart: number, bits: number): void {
		const whole = bits >> 3;
		this._ensure(bits);
		const buf = this._buf;
		const shift = this._pos & 7;
		if (shift === 0) {
			buf.set(source.subarray(byteStart, byteStart + whole), this._pos >> 3);
		} else {
			// Each source byte straddles two destination bytes
			let at = this._pos >> 3;
			const back = 8 - shift;
			for (let i = 0; i < whole; i++) {
				const byte = source[byteStart + i];
				buf[at] |= byte >>> shift;
				buf[++at] |= (byte << back) & 255;
			}
		}
		this._pos += whole << 3;
		const rest = bits & 7;
		if (rest) this.writeBits(source[byteStart + whole] >>> (8 - rest), rest);
	}

	/** A copy of what's been written, rounded up to whole bytes. */
	toBytes (): Uint8Array {
		return this._buf.slice(0, (this._pos + 7) >> 3);
	}
}

const scratch32 = new Float32Array(1);
const scratchU32 = new Uint32Array(scratch32.buffer);

/** Reads what IgeNetBitWriter wrote. Reading past the end throws a RangeError (a malformed message). */
export class IgeNetBitReader {
	_buf: Uint8Array;
	_pos = 0;
	_end: number;

	constructor (bytes: Uint8Array) {
		this._buf = bytes;
		this._end = bytes.length * 8;
	}

	get bitPosition (): number {
		return this._pos;
	}

	/** Bits left, counting the padding of the last byte. */
	get bitsLeft (): number {
		return this._end - this._pos;
	}

	readBits (bits: number): number {
		if (bits <= 0) return 0;
		if (this._pos + bits > this._end) throw new RangeError("Read past the end of the message");
		const buf = this._buf;
		let pos = this._pos;
		this._pos += bits;
		let remaining = bits;
		let value = 0;
		while (remaining > 0) {
			const space = 8 - (pos & 7);
			const take = remaining < space ? remaining : space;
			value = (value << take) | ((buf[pos >> 3] >>> (space - take)) & ((1 << take) - 1));
			remaining -= take;
			pos += take;
		}
		return value >>> 0;
	}

	readBool (): boolean {
		return this.readBits(1) === 1;
	}

	readVarUint (): number {
		let value = 0;
		let scale = 1;
		for (let i = 0; i < 8; i++) {
			const byte = this.readBits(8);
			value += (byte & 127) * scale;
			if (byte < 128) return value;
			scale *= 128;
		}
		throw new RangeError("Bad varint");
	}

	readVarInt (): number {
		const value = this.readVarUint();
		return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
	}

	readFloat32 (): number {
		scratchU32[0] = this.readBits(32);
		return scratch32[0];
	}

	readString (): string {
		const length = this.readVarUint();
		if (this._pos + length * 8 > this._end) throw new RangeError("Read past the end of the message");
		const bytes = new Uint8Array(length);
		for (let i = 0; i < length; i++) bytes[i] = this.readBits(8);
		return textDecoder.decode(bytes);
	}

	align (): void {
		this._pos = (this._pos + 7) & ~7;
	}
}

/** Bits needed to count `n` distinct values (0 for one or none). */
export function igeNetBitsFor (n: number): number {
	return n <= 1 ? 0 : 32 - Math.clz32(n - 1);
}
