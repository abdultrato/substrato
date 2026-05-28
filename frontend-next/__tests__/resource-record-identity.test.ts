import { describe, expect, it } from "vitest"

import { buildRecordDetailHref, primaryRecordId } from "@/lib/resources/recordIdentity"

describe("resource record identity", () => {
  it("uses only primary identifiers for detail routes", () => {
    expect(primaryRecordId({ id: 7, custom_id: "REQ-7" })).toBe(7)
    expect(primaryRecordId({ pk: "abc", id_custom: "LAB-1" })).toBe("abc")
    expect(primaryRecordId({ custom_id: "REQ-7", id_custom: "LAB-1" })).toBeNull()
    expect(primaryRecordId({ id: "", pk: "   " })).toBeNull()
  })

  it("builds detail hrefs only when a usable primary id exists", () => {
    expect(buildRecordDetailHref("/resources/pharmacy/product", { id: 12 })).toBe("/resources/pharmacy/product/12")
    expect(buildRecordDetailHref("/resources/pharmacy/product/", { pk: "A/B" })).toBe(
      "/resources/pharmacy/product/A%2FB"
    )
    expect(buildRecordDetailHref("/resources/pharmacy/product", { custom_id: "MED-12" })).toBeNull()
    expect(buildRecordDetailHref("", { id: 12 })).toBeNull()
  })
})
