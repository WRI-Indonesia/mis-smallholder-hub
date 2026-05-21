import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";

describe("Performance - Auth operations", () => {
  it("bcrypt hash completes under 500ms (cost factor 10)", async () => {
    const start = performance.now();
    await bcrypt.hash("P@ssword123", 10);
    const duration = performance.now() - start;

    console.log(`  bcrypt hash: ${duration.toFixed(1)}ms`);
    expect(duration).toBeLessThan(500);
  });

  it("bcrypt compare completes under 500ms", async () => {
    const hash = await bcrypt.hash("P@ssword123", 10);

    const start = performance.now();
    await bcrypt.compare("P@ssword123", hash);
    const duration = performance.now() - start;

    console.log(`  bcrypt compare: ${duration.toFixed(1)}ms`);
    expect(duration).toBeLessThan(500);
  });

  it("menu tree building handles 100 items under 5ms", () => {
    // Generate 100 mock items
    const items = Array.from({ length: 10 }, (_, i) => ({
      key: `parent-${i}`,
      parentKey: null as string | null,
      title: `Parent ${i}`,
      url: `/p${i}`,
      icon: null as string | null,
    }));

    // Add 9 children per parent
    for (let p = 0; p < 10; p++) {
      for (let c = 0; c < 9; c++) {
        items.push({
          key: `child-${p}-${c}`,
          parentKey: `parent-${p}`,
          title: `Child ${p}-${c}`,
          url: `/p${p}/c${c}`,
          icon: null,
        });
      }
    }

    const start = performance.now();
    const parents = items.filter((i) => !i.parentKey);
    parents.map((p) => ({
      ...p,
      children: items.filter((c) => c.parentKey === p.key),
    }));
    const duration = performance.now() - start;

    console.log(`  menu tree (100 items): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(5);
  });

  it("RBAC resolution handles 50 districts under 1ms", () => {
    const provinces: Record<string, string[]> = {};
    for (let i = 0; i < 5; i++) {
      provinces[`prov-${i}`] = Array.from({ length: 10 }, (_, j) => `dist-${i}-${j}`);
    }

    const user = { provinces: ["prov-0", "prov-1", "prov-2"], districts: ["extra-1", "extra-2"] };

    const start = performance.now();
    const ids = new Set<string>();
    for (const prov of user.provinces) {
      (provinces[prov] ?? []).forEach((d) => ids.add(d));
    }
    for (const d of user.districts) ids.add(d);
    const duration = performance.now() - start;

    console.log(`  RBAC resolve (50 districts): ${duration.toFixed(3)}ms`);
    expect(duration).toBeLessThan(1);
    expect(ids.size).toBe(32); // 30 from provinces + 2 direct
  });
});
