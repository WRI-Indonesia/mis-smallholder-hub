import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma first
vi.mock("@/lib/prisma", () => ({
  prisma: {
    dashboardStats: {
      findUnique: vi.fn(),
    },
    dashboardGroupStats: {
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
      (prisma.dashboardStats.findUnique as any).mockResolvedValue({
        totalGroups: 10,
        totalFarmers: 50,
        maleFarmers: 30,
        femaleFarmers: 20,
        totalParcels: 75,
        totalAreaHa: 125.5,
        trainingPKT: 0,
        trainingBMPGAP: 0,
        trainingPreSertifikasi: 0,
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
      expect(prisma.dashboardStats.findUnique).toHaveBeenCalledWith({
        where: {
          districtId_batchId: { districtId: "GLOBAL", batchId: "ALL" },
        },
      });
    });

    it("TC-2: should filter by districtId", async () => {
      (prisma.dashboardStats.findUnique as any).mockResolvedValue({
        totalGroups: 5,
        totalFarmers: 25,
        maleFarmers: 15,
        femaleFarmers: 10,
        totalParcels: 30,
        totalAreaHa: 60,
        trainingPKT: 0,
        trainingBMPGAP: 0,
        trainingPreSertifikasi: 0,
      });

      const result = await getDashboardStats({ districtId: "dist-1" });

      expect(result.success).toBe(true);
      expect(prisma.dashboardStats.findUnique).toHaveBeenCalledWith({
        where: {
          districtId_batchId: { districtId: "dist-1", batchId: "ALL" },
        },
      });
    });

    it("TC-3: should handle null totalAreaHa", async () => {
      (prisma.dashboardStats.findUnique as any).mockResolvedValue({
        totalGroups: 1,
        totalFarmers: 5,
        maleFarmers: 3,
        femaleFarmers: 2,
        totalParcels: 5,
        totalAreaHa: null,
        trainingPKT: 0,
        trainingBMPGAP: 0,
        trainingPreSertifikasi: 0,
      });

      const result = await getDashboardStats();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalAreaHa).toBe(0);
      }
    });

    it("TC-7: should handle errors", async () => {
      (prisma.dashboardStats.findUnique as any).mockRejectedValue(new Error("Database error"));

      const result = await getDashboardStats();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("getDashboardGroupMarkers", () => {
    it("TC-5: should return group markers with all fields", async () => {
      const mockGroupStats = [
        {
          farmerGroup: { id: "group-1", name: "KT Maju" },
          locationLat: -6.2,
          locationLong: 106.8,
          districtName: "Jakarta Pusat",
          farmerCount: 10,
          maleFarmers: 6,
          femaleFarmers: 4,
          parcelCount: 15,
          totalAreaHa: 25.5,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
        },
        {
          farmerGroup: { id: "group-2", name: "KT Sejahtera" },
          locationLat: null,
          locationLong: null,
          districtName: "Jakarta Selatan",
          farmerCount: 8,
          maleFarmers: 5,
          femaleFarmers: 3,
          parcelCount: 12,
          totalAreaHa: 20,
          trainingPKT: 0,
          trainingBMPGAP: 0,
          trainingPreSertifikasi: 0,
        },
      ];

      (prisma.dashboardGroupStats.findMany as any).mockResolvedValue(mockGroupStats);

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

      expect(prisma.dashboardGroupStats.findMany).toHaveBeenCalledWith({
        where: { batchId: "ALL" },
        include: { farmerGroup: { select: { id: true, name: true } } },
        orderBy: { farmerGroup: { name: "asc" } },
      });
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
