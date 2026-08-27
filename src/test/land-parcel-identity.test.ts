import { describe, it, expect } from "vitest";
import { parcelIdentityUpsertArgs } from "@/lib/land-parcel-identity";

/**
 * Identitas lahan stabil antar revisi (`parcelUid`, Decision Log 2026-08-27,
 * #296/#297). Helper ini adalah SATU-SATUNYA sumber argumen upsert yang
 * dipakai `createLandParcel` dan bulk upload, sehingga menguji helper = menguji
 * kontrak kedua jalur (server action sendiri tidak diimpor di vitest — rantai
 * next-auth tak resolve, konvensi repo).
 */
describe("parcelIdentityUpsertArgs — kontrak identitas lahan (parcelUid)", () => {
  const key = { farmerId: "farmer-1", parcelId: "APSS.0001.A.14.01.10.2012" };

  it("kunci upsert = unique composite (farmerId, parcelId) — bukan id baris revisi", () => {
    const args = parcelIdentityUpsertArgs(key, "user-1");
    expect(args.where).toEqual({ farmerId_parcelId: { farmerId: "farmer-1", parcelId: "APSS.0001.A.14.01.10.2012" } });
  });

  it("revisi 0 dan revisi N pasangan yang sama menghasilkan kunci identik → identitas dipakai ulang", () => {
    const rev0 = parcelIdentityUpsertArgs({ ...key }, "user-1");
    const revN = parcelIdentityUpsertArgs({ ...key }, "user-2");
    expect(revN.where).toEqual(rev0.where);
  });

  it("parcelId sama pada petani berbeda = identitas berbeda (parcelId hanya unik per petani)", () => {
    const a = parcelIdentityUpsertArgs({ farmerId: "farmer-1", parcelId: "LH-01" }, null);
    const b = parcelIdentityUpsertArgs({ farmerId: "farmer-2", parcelId: "LH-01" }, null);
    expect(a.where).not.toEqual(b.where);
  });

  it("create: mengisi pasangan + createdBy; tidak menyentuh isActive (default true dari skema)", () => {
    const args = parcelIdentityUpsertArgs(key, "user-1");
    expect(args.create).toEqual({ farmerId: "farmer-1", parcelId: "APSS.0001.A.14.01.10.2012", createdBy: "user-1" });
  });

  it("update: pasangan yang pernah dinonaktifkan lalu didaftarkan ulang diaktifkan kembali (satelit tetap tertaut)", () => {
    const args = parcelIdentityUpsertArgs(key, "user-9");
    expect(args.update).toEqual({ isActive: true, modifiedBy: "user-9" });
  });

  it("userId null (sesi tanpa id) diteruskan sebagai null, bukan string kosong", () => {
    const args = parcelIdentityUpsertArgs(key, null);
    expect(args.create.createdBy).toBeNull();
    expect(args.update.modifiedBy).toBeNull();
  });

  it("select hanya id — pemanggil cuma butuh parcelUid", () => {
    expect(parcelIdentityUpsertArgs(key, null).select).toEqual({ id: true });
  });

  it("mengabaikan properti lain pada record bulk (spread record aman)", () => {
    const record = { ...key, area: 1.2, geometry: { type: "Polygon" }, revision: 3 };
    const args = parcelIdentityUpsertArgs(record, null);
    expect(Object.keys(args.create).sort()).toEqual(["createdBy", "farmerId", "parcelId"]);
  });
});
