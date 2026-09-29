import { afterEach, describe, expect, it, vi } from "vitest";
import { minTime, minTimeAsync } from "./perf-utils";

// #311 — penjaga metode ukur test performa itu sendiri: yang dilaporkan adalah
// MINIMUM (lonjakan beban mesin tak menggagalkan gate), jumlah putaran dibatasi,
// dan nilai hasil tetap dikembalikan untuk assertion lanjutan.
const clock = (durations: number[]) => {
  let now = 0;
  let i = 0;
  const calls: number[] = [];
  vi.spyOn(performance, "now").mockImplementation(() => now);
  return {
    calls,
    run: <T>(v: T) => {
      now += durations[i++ % durations.length];
      calls.push(i);
      return v;
    },
  };
};

afterEach(() => vi.restoreAllMocks());

describe("minTime", () => {
  it("melaporkan waktu MINIMUM — satu putaran lambat (beban mesin) tidak menentukan hasil", () => {
    const c = clock([300, 12, 250]);
    const { ms, value } = minTime(() => c.run("hasil"));
    expect(ms).toBe(12);
    expect(value).toBe("hasil");
  });

  it("minimal 3 putaran; test ringan diulang sampai 10 putaran", () => {
    const light = clock([1]);
    minTime(() => light.run(0));
    expect(light.calls).toHaveLength(10);
  });

  it("test berat berhenti setelah 3 putaran begitu anggaran ±1 detik habis", () => {
    const heavy = clock([600]);
    minTime(() => heavy.run(0));
    expect(heavy.calls).toHaveLength(3);
  });

  it("regresi sungguhan tetap terlihat: semua putaran lambat → minimum tetap lambat", () => {
    const slow = clock([900, 950, 1000]);
    expect(minTime(() => slow.run(0)).ms).toBe(900);
  });

  it("varian async sama: minimum + nilai terakhir", async () => {
    const c = clock([80, 40, 60]);
    const { ms, value } = await minTimeAsync(async () => c.run("ok"));
    expect(ms).toBe(40);
    expect(value).toBe("ok");
  });
});
