import * as React from "react";
import { describe, expect, it } from "vitest";
import { collectSelectItems, SelectContent, SelectGroup, SelectItem, SelectLabel } from "@/components/ui/select";

/**
 * Wrapper `Select` menurunkan `items` dari anak `SelectItem` (#350): tanpa
 * itu `SelectValue` base-ui menampilkan `String(value)` mentah di pemicu.
 */
describe("collectSelectItems", () => {
  it("mengumpulkan value → label menembus SelectContent/Group/fragment/array", () => {
    const out: { value: unknown; label: React.ReactNode }[] = [];
    collectSelectItems(
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        <SelectGroup>
          <SelectLabel>Grup</SelectLabel>
          {["active", "inactive"].map((v) => (
            <SelectItem key={v} value={v}>
              {v === "active" ? "Aktif" : "Nonaktif"}
            </SelectItem>
          ))}
        </SelectGroup>
        <>
          <SelectItem value="_empty">-- Kosongkan --</SelectItem>
        </>
        {null}
        {false}
      </SelectContent>,
      out,
    );
    expect(out.map((i) => [i.value, i.label])).toEqual([
      ["all", "Semua Status"],
      ["active", "Aktif"],
      ["inactive", "Nonaktif"],
      ["_empty", "-- Kosongkan --"],
    ]);
  });

  it("tanpa SelectItem → kosong (Select meneruskan items=undefined)", () => {
    const out: { value: unknown; label: React.ReactNode }[] = [];
    collectSelectItems(<div>tidak ada item</div>, out);
    expect(out).toEqual([]);
  });
});
