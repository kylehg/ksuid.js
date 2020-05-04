import {KSUID, KSUID2} from "./index"

describe("KSUID", () => {
  it("hex strings are sorted by creation time", () => {
    const ksuids = [...new Array(100)].map((_) => new KSUID())
    const hexStrs = ksuids.map((id) => id.hex.substr(0, 8))
    const hexStrsSorted = [...hexStrs].sort()
    expect(hexStrs).toEqual(hexStrsSorted)
  })
})
