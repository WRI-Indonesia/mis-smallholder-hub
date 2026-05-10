import "dotenv/config";
import { getDashboardStats, getDashboardGroupMarkers, getDistrictsForDashboard } from "@/server/actions/dashboard";

async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  maxMs: number
): Promise<void> {
  console.log(`\n🔍 Testing ${name}...`);
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`✅ ${name}: ${duration.toFixed(2)}ms`);
    
    if (duration > maxMs) {
      console.log(`⚠️  Warning: ${name} took ${duration.toFixed(2)}ms (expected < ${maxMs}ms)`);
    }
    
    // Log result summary
    if (typeof result === 'object' && result !== null && 'success' in result) {
      if (result.success) {
        console.log(`   Result: Success`);
        if ('data' in result && Array.isArray(result.data)) {
          console.log(`   Data length: ${result.data.length}`);
        }
      } else {
        console.log(`   Result: Error - ${(result as any).error}`);
      }
    }
  } catch (error) {
    const duration = performance.now() - start;
    console.log(`❌ ${name}: ${duration.toFixed(2)}ms (ERROR)`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log("🚀 Dashboard Performance Test");
  console.log("============================");

  // Test 1: getDashboardStats() without filter
  await measurePerformance(
    "getDashboardStats() - no filter",
    () => getDashboardStats(),
    500
  );

  // Test 2: getDashboardStats() with districtId filter
  await measurePerformance(
    "getDashboardStats() - with districtId",
    () => getDashboardStats({ districtId: "reg-1404" }),
    500
  );

  // Test 3: getDashboardGroupMarkers()
  await measurePerformance(
    "getDashboardGroupMarkers()",
    () => getDashboardGroupMarkers(),
    500
  );

  // Test 4: getDistrictsForDashboard()
  await measurePerformance(
    "getDistrictsForDashboard()",
    () => getDistrictsForDashboard(),
    100
  );

  console.log("\n✅ Performance test completed");
}

main().catch(console.error);