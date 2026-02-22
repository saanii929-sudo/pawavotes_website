/**
 * Debug USSD - Check what awards are being filtered
 */

async function debugUSSD() {
  const baseURL = 'http://ockc848ksk4o8k888wow0osc.84.46.246.78.sslip.io/api/ussd/vote';
  
  console.log('\n🔍 Debugging USSD Award Filtering...\n');
  console.log('Endpoint:', baseURL);
  console.log('Current Time:', new Date().toISOString());
  console.log('\n' + '─'.repeat(60) + '\n');

  try {
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionID: `debug-${Date.now()}`,
        userID: 'CP9VG7Y5TN_dNri2',
        newSession: true,
        msisdn: '233552732025',
        userData: '',
        network: 'MTN'
      })
    });

    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    
    if (data.message.includes('No active awards')) {
      console.log('\n❌ Issue: Awards are being filtered out');
      console.log('\nPossible reasons:');
      console.log('1. Award status is not "published"');
      console.log('2. Voting dates are not set correctly');
      console.log('3. Current time is outside voting period');
      console.log('4. Stage validation is too strict');
      console.log('\nCheck your production logs for "USSD:" prefixed messages');
      console.log('They will show exactly why awards are being filtered');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugUSSD();
