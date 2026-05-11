#!/usr/bin/env node

// Test dashboard server component data flow
const { getDashboardStats, getDashboardGroupMarkers, getDistrictsForDashboard, getBatchesForDashboard } = require('./src/server/actions/dashboard');

async function main() {
  try {
    console.log('🧪 Testing dashboard data flow...');
    
    const filters = { districtId: undefined, batchId: undefined };
    
    // Test group markers specifically
    console.log('\n📍 Testing getDashboardGroupMarkers...');
    const markersResult = await getDashboardGroupMarkers(filters);
    
    if (markersResult.success) {
      console.log(`✅ Raw markers from DB: ${markersResult.data.length}`);
      
      // Filter like in dashboard-server.tsx
      const validMarkers = markersResult.data.filter(marker => 
        marker.locationLat !== null && marker.locationLong !== null
      );
      
      console.log(`📍 Markers with coordinates: ${validMarkers.length}`);
      
      // Transform like in dashboard-server.tsx
      const farmerGroups = validMarkers.map(marker => ({
        id: marker.id,
        name: marker.name,
        region: marker.districtName,
        lat: marker.locationLat,
        lng: marker.locationLong,
        totalPetani: marker.farmerCount,
        maleFarmers: marker.maleFarmers,
        femaleFarmers: marker.femaleFarmers,
        totalParcels: marker.parcelCount,
        totalArea: `${marker.totalAreaHa.toFixed(1)} Ha`,
        trainingPackage1: marker.trainingPKT,
        trainingPackage2MK: marker.trainingBMPGAP,
        trainingPackage2HSE: 0,
        trainingPackage34: marker.trainingPreSertifikasi,
      }));
      
      console.log(`🎯 Final transformed markers: ${farmerGroups.length}`);
      
      console.log('\nFirst 3 transformed markers:');
      farmerGroups.slice(0, 3).forEach(g => {
        console.log(`  - ${g.name} (${g.id}): (${g.lat}, ${g.lng}) - ${g.totalPetani} farmers`);
      });
      
      // Check if any markers have invalid coordinates
      const invalidCoords = farmerGroups.filter(g => 
        !g.lat || !g.lng || g.lat === 0 || g.lng === 0
      );
      
      if (invalidCoords.length > 0) {
        console.log(`\n⚠️  Markers with invalid coordinates: ${invalidCoords.length}`);
        invalidCoords.forEach(g => {
          console.log(`  - ${g.name}: (${g.lat}, ${g.lng})`);
        });
      }
      
    } else {
      console.log('❌ Markers error:', markersResult.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error.stack);
  }
}

require('dotenv').config();
main().catch(console.error);