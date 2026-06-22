#!/usr/bin/env node

const { getDashboardStats, getDashboardGroupMarkers, getDistrictsForDashboard, getBatchesForDashboard } = require('./src/server/actions/dashboard.ts');

async function main() {
  try {
    console.log('🧪 Testing dashboard API...');
    
    const filters = { districtId: undefined, batchId: undefined };
    
    console.log('\n📊 Testing getDashboardStats...');
    const statsResult = await getDashboardStats(filters);
    if (statsResult.success) {
      console.log('✅ Stats loaded:', {
        totalGroups: statsResult.data.totalGroups,
        totalFarmers: statsResult.data.totalFarmers,
        maleFarmers: statsResult.data.maleFarmers,
        femaleFarmers: statsResult.data.femaleFarmers
      });
    } else {
      console.log('❌ Stats error:', statsResult.error);
    }

    console.log('\n📍 Testing getDashboardGroupMarkers...');
    const markersResult = await getDashboardGroupMarkers(filters);
    if (markersResult.success) {
      const validMarkers = markersResult.data.filter(m => m.locationLat && m.locationLong);
      console.log(`✅ Markers loaded: ${markersResult.data.length} total, ${validMarkers.length} with coordinates`);
      
      console.log('\nFirst 3 markers with coordinates:');
      validMarkers.slice(0, 3).forEach(m => {
        console.log(`  - ${m.name}: (${m.locationLat}, ${m.locationLong}) - ${m.farmerCount} farmers`);
      });
    } else {
      console.log('❌ Markers error:', markersResult.error);
    }

    console.log('\n🏘️ Testing getDistrictsForDashboard...');
    const districtsResult = await getDistrictsForDashboard();
    if (districtsResult.success) {
      console.log(`✅ Districts loaded: ${districtsResult.data.length}`);
    } else {
      console.log('❌ Districts error:', districtsResult.error);
    }

    console.log('\n📅 Testing getBatchesForDashboard...');
    const batchesResult = await getBatchesForDashboard();
    if (batchesResult.success) {
      console.log(`✅ Batches loaded: ${batchesResult.data.length}`);
      batchesResult.data.forEach(b => console.log(`  - ${b.name} (${b.id})`));
    } else {
      console.log('❌ Batches error:', batchesResult.error);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

require('dotenv').config();
main().catch(console.error);