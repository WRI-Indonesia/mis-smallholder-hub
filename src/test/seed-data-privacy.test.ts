import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Penjaga data seed di repo publik (#390).
 *
 * `users.csv` pernah memuat email staf asli + kolom `password` teks polos.
 * Seed kini memakai akun fiktif ber-domain `example.test` dan password dari
 * `SEED_USER_PASSWORD`. Test ini memastikan pola lama tidak masuk lagi ke
 * `prisma/seeds/data/`.
 */

const DATA_DIR = join(__dirname, "../../prisma/seeds/data");
const csvFiles = readdirSync(DATA_DIR).filter((f) => f.endsWith(".csv"));
const EMAIL = /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
// Domain cadangan RFC 2606/6761 — tak pernah milik orang/organisasi nyata.
const RESERVED_DOMAIN = /(^|\.)(example\.(test|com|org|net)|test|invalid|example)$/i;

describe("seed data privacy (#390)", () => {
  it("menemukan berkas CSV seed", () => {
    expect(csvFiles).toContain("users.csv");
  });

  it.each(csvFiles)("%s tidak punya kolom password/secret", (file) => {
    const header = readFileSync(join(DATA_DIR, file), "utf-8").split("\n")[0].toLowerCase();
    expect(header).not.toMatch(/pass(word)?|secret|token/);
  });

  it.each(csvFiles)("%s hanya memuat email ber-domain cadangan", (file) => {
    const content = readFileSync(join(DATA_DIR, file), "utf-8");
    const domains = [...content.matchAll(EMAIL)].map((m) => m[1]);
    expect(domains.filter((d) => !RESERVED_DOMAIN.test(d))).toEqual([]);
  });

  it("seed-users membaca password dari env, bukan dari CSV", () => {
    const src = readFileSync(join(__dirname, "../../prisma/seeds/seed-users.ts"), "utf-8");
    expect(src).toContain("process.env.SEED_USER_PASSWORD");
    expect(src).not.toMatch(/row\.password/);
  });
});
