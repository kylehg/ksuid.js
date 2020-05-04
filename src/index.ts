/**
 * Isomorphic JS implementation of K-sortable UUIDs (KSUIDs)
 *
 * Based on Segment's reference Golang KSUID, it includes:
 * - Use of modern browser `crypto.getRandomValues()` API when available
 * - Use of Node `crypto.randomFillSync()` API when available
 * - Backing through JS native TypedArrays
 * - Ability to initialize KSUIDs from constituent parts
 * - Rendering to hex, base36, and base62 strings
 * - 128 bits of cryptographic randomness ensures fewer collisions than UUID4
 * - Newer epoch starting in July 2017
 *
 * Besides the default KSUID class, which besides the epoch mirrors closely
 * Segment's implementation, this includes KSUID2, which adds:
 * - Millisecond precision (instead of second) for KSUID date part
 * - 48 date bits (instead of 32) = 8925 years of headroom
 */

export class KSUID {
  // Overrideable configuration options
  get EPOCH_MS() {
    return 15e11 // 2017-07-14T02:40:00.000Z
  }

  get DATE_PART_BYTES() {
    return 4
  }

  get RAND_PART_BYTES() {
    return 16
  }

  get DATE_PART_UNIT() {
    return 1_000
  }

  get TOTAL_BYTES() {
    return this.DATE_PART_BYTES + this.RAND_PART_BYTES
  }

  get MAX_DATE_MS() {
    return (
      this.EPOCH_MS +
      Math.pow(2, 8 * this.DATE_PART_BYTES) * this.DATE_PART_UNIT
    )
  }

  get MAX_LEN_BASE36() {
    return maxLength(this.TOTAL_BYTES, 256, 36)
  }

  get MAX_LEN_BASE62() {
    return maxLength(this.TOTAL_BYTES, 256, 62)
  }

  bytes: Uint8Array

  constructor(datePart?: Uint8Array, randPart?: Uint8Array) {
    this.bytes = new Uint8Array(this.TOTAL_BYTES)
    this.setDatePart(datePart || this.dateToBytes(new Date()))
    this.setRandPart(randPart || this.getRandBytes())
  }

  get datePart(): Uint8Array {
    return new Uint8Array(this.bytes.buffer, 0, this.DATE_PART_BYTES)
  }
  get randPart(): Uint8Array {
    return new Uint8Array(
      this.bytes.buffer,
      this.DATE_PART_BYTES,
      this.RAND_PART_BYTES
    )
  }

  setDatePart(datePart: Uint8Array) {
    this.bytes.set(datePart)
  }

  setRandPart(randPart: Uint8Array) {
    this.bytes.set(randPart, this.DATE_PART_BYTES)
  }

  get date(): Date {
    return this.bytesToDate(this.datePart)
  }

  get hex(): string {
    return Array.from(this.bytes)
      .map((x) => ("00" + x.toString(16)).slice(-2))
      .join("")
  }

  get base36(): string {
    return baseConvertIntArray(Array.from(this.bytes), {
      from: 256,
      to: 36,
      fixedLength: this.MAX_LEN_BASE36,
    })
      .map((x) => x.toString(36))
      .join("")
  }

  get base62(): string {
    return baseConvertIntArray(Array.from(this.bytes), {
      from: 256,
      to: 62,
      fixedLength: this.MAX_LEN_BASE62,
    })
      .map((x) => ALPHABET.charAt(x))
      .join("")
  }

  dateToBytes(date: Date): Uint8Array {
    const dateMs = date.valueOf()
    if (dateMs < this.EPOCH_MS) {
      throw new RangeError(
        `Date component must be > ${new Date(this.EPOCH_MS)}`
      )
    }
    if (dateMs >= this.MAX_DATE_MS) {
      throw new RangeError(
        `Date component must be < ${new Date(this.MAX_DATE_MS)}`
      )
    }
    // TODO explain this math
    const dateDiff = Math.floor((dateMs - this.EPOCH_MS) / this.DATE_PART_UNIT)
    const bytes = new Uint8Array(8)
    const dv = new DataView(bytes.buffer).setBigUint64(0, BigInt(dateDiff))
    return bytes.slice(bytes.length - this.DATE_PART_BYTES)
  }

  bytesToDate(bytes: Uint8Array): Date {
    // TODO explain this math
    const arr = new Uint8Array(8)
    arr.set(bytes, arr.length - this.DATE_PART_BYTES)
    const dateDiff = new DataView(arr.buffer).getBigUint64(0)
    const dateMs = Number(dateDiff) * this.DATE_PART_UNIT + this.EPOCH_MS
    return new Date(dateMs)
  }

  getRandBytes(): Uint8Array {
    const arr = new Uint8Array(this.RAND_PART_BYTES)
    if (
      typeof window !== "undefined" &&
      window.crypto &&
      typeof window.crypto.getRandomValues === "function"
    ) {
      window.crypto.getRandomValues(arr)
    } else if (typeof require === "function") {
      const crypto = require("crypto")
      crypto.randomFillSync(arr)
    } else {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
    }
    return arr
  }
}

export class KSUID2 extends KSUID {
  get DATE_PART_BYTES() {
    return 6
  }
  get DATE_PART_UNIT() {
    return 1
  }
}

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

/**
 * Return the max length of an array converted from base `from` to base `to`
 * @see https://github.com/novemberborn/base-convert-int-array/blob/master/index.js
 */
function maxLength(arrayLen: number, from: number, to: number): number {
  return Math.ceil((arrayLen * Math.log2(from)) / Math.log2(to))
}

/**
 * Convert an array of numbers in base `from` to base `to`, adjusting to
 * `fixedLength` if provided
 * @see https://github.com/novemberborn/base-convert-int-array/blob/master/index.js
 */
function baseConvertIntArray(
  array: number[],
  {
    from,
    to,
    fixedLength = null,
  }: {from: number; to: number; fixedLength: number | null}
): number[] {
  const maxLen = maxLength(array.length, from, to)
  const length = fixedLength === null ? maxLen : fixedLength
  const result = new Array(length)

  // Each iteration prepends the resulting value, so start the offset at the end.
  let offset = length
  let input = array
  while (input.length > 0) {
    if (offset === 0) {
      throw new RangeError(
        `Fixed length of ${fixedLength} is too small, expected at least ${maxLen}`
      )
    }

    const quotients = []
    let remainder = 0

    for (const digit of input) {
      const acc = digit + remainder * from
      const q = Math.floor(acc / to)
      remainder = acc % to

      if (quotients.length > 0 || q > 0) {
        quotients.push(q)
      }
    }

    result[--offset] = remainder
    input = quotients
  }

  // Trim leading padding, unless length is fixed.
  if (fixedLength === null) {
    return offset > 0 ? result.slice(offset) : result
  }

  // Fill in any holes in the result array.
  while (offset > 0) {
    result[--offset] = 0
  }
  return result
}
