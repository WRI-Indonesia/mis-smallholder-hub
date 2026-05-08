/**
 * map.test.ts
 *
 * Unit tests for Issue #37 — Interactive Map Dashboard
 * Tests cover: server action getMapData() (mocked Prisma + raw query),
 * GeoJSON validation, and stats calculation.
 *
 * No live DB required — all Prisma calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    farmerGroup: {
      findMany: mockFindMany,
      count: mockCount,
    },
    farmer: { count: mockCount },
    landParcel: { count: mockCount },
    $queryRaw: mockQueryRaw,
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockGroup = {
  id: "group-1",
  name: "ICS Sei Galuh",
  code: "ICS-1406-01",
  locationLat: 0.5123,
  locationLong: 101.4567,
  district: {
    name: "Kampar",
    province: { name: "Riau" },
  },
  _count: { farmers: 15 },
};

const mockParcelRow = {
  id: "parcel-1",
  parcel_code: "PC-001",
  farmer_name: "Budi Santoso",
  group_name: "ICS Sei Galuh",
  polygon_geojson: JSON.stringify({
    type: "Polygon",
    coordinates: [[[101.4, 0.5], [101.5, 0.5], [101.5, 0.6], [101.4, 0.6], [101.4, 0.5]]],
  }),
  polygon_size_ha: 2.5,
  commodity_name: "Kelapa Sawit",
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Interactive Map — Issue #37", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── TC-1: getMapData returns farmerGroups with valid lat/lng ──────────────
  it("TC-1: getMapData() returns farmerGroups with valid lat/lng", async () => {
    mockFindMany.mockResolvedValueOnce([mockGroup]);
    mockQueryRaw.mockResolvedValueOnce([mockParcelRow]);
    mockCount.mockResolvedValue(29);

    const { getMapData } = await import("../server/actions/map");
    const result = await getMapData();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const groups = result.data!.farmerGroups;
    expect(groups).toHaveLength(1);
    expect(groups[0].lat).toBe(0.5123);
    expect(groups[0].lng).toBe(101.4567);
    expect(groups[0].name).toBe("ICS Sei Galuh");
    expect(groups[0].farmerCount).toBe(15);
  });

  // ── TC-2: getMapData returns landParcels with valid GeoJSON ───────────────
  it("TC-2: getMapData() returns landParcels with valid GeoJSON polygon", async () => {
    mockFindMany.mockResolvedValueOnce([mockGroup]);
    mockQueryRaw.mockResolvedValueOnce([mockParcelRow]);
    mockCount.mockResolvedValue(10);

    const { getMapData } = await import("../server/actions/map");
    const result = await getMapData();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parcels = result.data!.landParcels;
    expect(parcels).toHaveLength(1);
    expect(parcels[0].polygonGeoJSON.type).toBe("Polygon");
    expect(Array.isArray(parcels[0].polygonGeoJSON.coordinates)).toBe(true);
    expect(parcels[0].parcelCode).toBe("PC-001");
    expect(parcels[0].farmerName).toBe("Budi Santoso");
  });

  // ── TC-3: getMapData filters groups without coordinates ───────────────────
  it("TC-3: getMapData() only fetches groups with non-null coordinates", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    mockQueryRaw.mockResolvedValueOnce([]);
    mockCount.mockResolvedValue(0);

    const { getMapData } = await import("../server/actions/map");
    await getMapData();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          locationLat: { not: null },
          locationLong: { not: null },
        },
      })
    );
  });

  // ── TC-4: GeoJSON polygon format is valid ─────────────────────────────────
  it("TC-4: parsed GeoJSON polygon has correct structure", () => {
    const raw = mockParcelRow.polygon_geojson;
    const parsed = JSON.parse(raw) as GeoJSON.Polygon;

    expect(parsed.type).toBe("Polygon");
    expect(Array.isArray(parsed.coordinates)).toBe(true);
    expect(parsed.coordinates[0]).toHaveLength(5); // closed ring
    // First and last coordinate should be the same (closed ring)
    expect(parsed.coordinates[0][0]).toEqual(parsed.coordinates[0][4]);
  });

  // ── TC-5: Stats are calculated correctly ──────────────────────────────────
  it("TC-5: stats reflect correct counts from data", async () => {
    const mockGroupCount = vi.fn().mockResolvedValue(29);
    const mockFarmerCount = vi.fn().mockResolvedValue(150);
    const mockParcelCount = vi.fn().mockResolvedValue(10);

    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        farmerGroup: { findMany: mockFindMany, count: mockGroupCount },
        farmer: { count: mockFarmerCount },
        landParcel: { count: mockParcelCount },
        $queryRaw: mockQueryRaw,
      },
    }));

    mockFindMany.mockResolvedValueOnce([mockGroup, { ...mockGroup, id: "group-2" }]);
    mockQueryRaw.mockResolvedValueOnce([mockParcelRow]);

    // Re-import to pick up new mock
    const { getMapData } = await import("../server/actions/map");
    const result = await getMapData();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const stats = result.data!.stats;
    expect(stats.groupsWithCoords).toBe(2);
    expect(stats.parcelsWithPolygon).toBe(1);
  });
});
