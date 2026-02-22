/**
 * Check Production Award
 * Directly queries the award that you voted on
 */

async function checkAward() {
  const awardId = '699b3902b967fcdebd370b03'; // From your voting logs
  const baseURL = 'http://ockc848ksk4o8k888wow0osc.84.46.246.78.sslip.io';
  
  console.log('\n🔍 Checking Production Award...\n');
  console.log('Award ID:', awardId);
  console.log('Current Time:', new Date().toISOString());
  console.log('\n' + '─'.repeat(60) + '\n');

  try {
    // Try to get award details through the public API
    const response = await fetch(`${baseURL}/api/awards/${awardId}`);
    
    if (response.ok) {
      const award = await response.json();
      console.log('Award Details:');
      console.log(JSON.stringify(award, null, 2));
    } else {
      console.log('❌ Could not fetch award details');
      console.log('Status:', response.status);
      console.log('\nThis might be because there\'s no public API endpoint for awards.');
      console.log('You need to check your production deployment logs instead.');
    }
    
    console.log('\n' + '─'.repeat(60));
    console.log('\n📋 What to check in your award:');
    console.log('   1. status: should be "published"');
    console.log('   2. votingStartDate: should be set and in the past');
    console.log('   3. votingEndDate: should be set and in the future');
    console.log('   4. votingStartTime: optional but recommended');
    console.log('   5. votingEndTime: optional but recommended');
    console.log('\n💡 Check your production logs for "USSD:" messages');
    console.log('   They will show exactly why the award is being filtered\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAward();
