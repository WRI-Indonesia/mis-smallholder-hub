import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma first
vi.mock("@/lib/prisma", () => ({
  prisma: {
    farmerGroup: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    farmer: {
      count: vi.fn(),
    },
    landParcel: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    trainingParticipant: {
      findMany: vi.fn(),
    },
    district: {
      findMany: vi.fn(),
    },
  },
}));

// Import after mocking
import { getDashboardStats, getDashboardGroupMarkers, getDistrictsForDashboard } from "@/server/actions/dashboard";
import { prisma } from "@/lib/prisma";

describe("Dashboard Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardStats", () => {
    it("TC-1: should return dashboard stats without filter", async () => {
      // Mock all the parallel queries
      (prisma.farmerGroup.count as any).mockResolvedValue(10);
      (prisma.farmer.count as any)
        .mockResolvedValueOnce(50) // total farmers
        .mockResolvedValueOnce(30) // male farmers
        .mockResolvedValueOnce(20); // female farmers
      (prisma.landParcel.count as any).mockResolvedValue(75);
      (prisma.landParcel.aggregate as any).mockResolvedValue({
        _sum: { polygonSizeHa: 125.5 },
      });

      const result = await getDashboardStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalGroups).toBe(10);
        expect(result.data.totalFarmers).toBe(50);
        expect(result.data.maleFarmers).toBe(30);
        expect(result.data.femaleFarmers).toBe(20);
        expect(result.data.totalParcels).toBe(75);
        expect(result.data.totalAreaHa).toBe(125.5);
        // Training stats should be hardcoded to 0
        expect(result.data.trainingPKT).toBe(0);
        expect(result.data.trainingBMPGAP).toBe(0);
        expect(result.data.trainingPreSertifikasi).toBe(0);
      }
    });

    it("TC-2: should filter by districtId", async () => {
      (prisma.farmerGroup.count as any).mockResolvedValue(5);
      (prisma.farmer.count as any)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(10);
      (prisma.landParcel.count as any).mockResolvedValue(30);
      (prisma.landParcel.aggregate as any).mockResolvedValue({
        _sum: { polygonSizeHa: 60.0 },
      });

      const result = await getDashboardStats({ districtId: "dist-1" });

      expect(result.success).toBe(true);
      expect(prisma.farmerGroup.count).toHaveBeenCalledWith({
        where: { districtId: "dist-1" },
      });
      expect(prisma.farmer.count).toHaveBeenCalledWith({
        where: { farmerGroup: { districtId: "dist-1" } },
      });
    });

    it("TC-3: should handle null totalAreaHa", async () => {
      (prisma.farmerGroup.count as any).mockResolvedValue(1);
      (prisma.farmer.count as any)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);
      (prisma.landParcel.count as any).mockResolvedValue(5);
      (prisma.landParcel.aggregate as any).mockResolvedValue({
        _sum: { polygonSizeHa: null }, // All parcels have null area
      });

      const result = await getDashboardStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalAreaHa).toBe(0);
      }
    });

    it("TC-7: should handle errors", async () => {
      (prisma.farmerGroup.count as any).mockRejectedValue(new Error("Database error"));

      const result = await getDashboardStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getDashboardGroupMarkers", () => {
    it("TC-5: should return group markers with all fields", async () => {
      const mockGroups = [
        {
          id: "group-1",
          name: "KT Maju",
          locationLat: -6.2,
          locationLong: 106.8,
          district: { name: "Jakarta Pusat" },
        },
        {
          id: "group-2",
          name: "KT Sejahtera",
          locationLat: null,
          locationLong: null,
          district: { name: "Jakarta Selatan" },
        },
      ];

      (prisma.farmerGroup.findMany as any).mockResolvedValue(mockGroups);
      
      // Mock stats for each group
      (prisma.farmer.count as any)
        .mockResolvedValueOnce(10) // group-1 total
        .mockResolvedValueOnce(6)  // group-1 male
        .mockResolvedValueOnce(4)  // group-1 female
        .mockResolvedValueOnce(8)  // group-2 total
        .mockResolvedValueOnce(5)  // group-2 male
        .mockResolvedValueOnce(3); // group-2 female

      (prisma.landParcel.count as any)
        .mockResolvedValueOnce(15) // group-1 parcels
        .mockResolvedValueOnce(12); // group-2 parcels

      (prisma.landParcel.aggregate as any)
        .mockResolvedValueOnce({ _sum: { polygonSizeHa: 25.5 } }) // group-1 area
        .mockResolvedValueOnce({ _sum: { polygonSizeHa: 20.0 } }); // group-2 area

      const result = await getDashboardGroupMarkers();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        
        const marker1 = result.data[0];
        expect(marker1.id).toBe("group-1");
        expect(marker1.name).toBe("KT Maju");
        expect(marker1.districtName).toBe("Jakarta Pusat");
        expect(marker1.locationLat).toBe(-6.2);
        expect(marker1.locationLong).toBe(106.8);
        expect(marker1.farmerCount).toBe(10);
        expect(marker1.maleFarmers).toBe(6);
        expect(marker1.femaleFarmers).toBe(4);
        expect(marker1.parcelCount).toBe(15);
        expect(marker1.totalAreaHa).toBe(25.5);
        // Training stats should be hardcoded to 0
        expect(marker1.trainingPKT).toBe(0);
        expect(marker1.trainingBMPGAP).toBe(0);
        expect(marker1.trainingPreSertifikasi).toBe(0);

        const marker2 = result.data[1];
        expect(marker2.locationLat).toBeNull();
        expect(marker2.locationLong).toBeNull();
        expect(marker2.trainingPKT).toBe(0);
        expect(marker2.trainingBMPGAP).toBe(0);
        expect(marker2.trainingPreSertifikasi).toBe(0);
      }
    });
  });

  describe("getDistrictsForDashboard", () => {
    it("TC-6: should return only districts with farmer groups", async () => {
      const mockDistricts = [
        { id: "dist-1", name: "Jakarta Pusat" },
        { id: "dist-2", name: "Jakarta Selatan" },
      ];

      (prisma.district.findMany as any).mockResolvedValue(mockDistricts);

      const result = await getDistrictsForDashboard();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockDistricts);
      }

      expect(prisma.district.findMany).toHaveBeenCalledWith({
        where: { farmerGroups: { some: {} } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    });

    it("TC-7: should handle errors in getDistrictsForDashboard", async () => {
      (prisma.district.findMany as any).mockRejectedValue(new Error("Database connection failed"));

      const result = await getDistrictsForDashboard();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
    });
  });
});