#!/usr/bin/env node

/**
 * Simple test runner for the chart generation system
 * Run with: node test-charts.js
 */

const scenarios = ['timeSeries', 'categorical', 'proportion', 'correlation'];

async function testScenario(scenario) {
  try {
    console.log(`\n🧪 Testing ${scenario} scenario...`);
    
    const response = await fetch(`http://localhost:3000/api/charts/test?scenario=${scenario}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log(`✅ ${scenario}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    
    if (result.toolCalls) {
      console.log(`📊 Tools called: ${result.toolCalls.map(tc => tc.tool).join(', ')}`);
      console.log(`🎯 Chart type: ${result.mockSaveResult?.message || 'Unknown'}`);
    }
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.log(`❌ ${scenario}: FAILED - ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting chart generation tests...');
  console.log('Make sure your Next.js dev server is running on localhost:3000');
  
  const results = [];
  
  for (const scenario of scenarios) {
    const result = await testScenario(scenario);
    results.push({ scenario, success: !!result?.success });
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Summary:');
  results.forEach(({ scenario, success }) => {
    console.log(`  ${success ? '✅' : '❌'} ${scenario}`);
  });
  
  const passedTests = results.filter(r => r.success).length;
  console.log(`\n🎯 Passed: ${passedTests}/${results.length}`);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testScenario, runAllTests };