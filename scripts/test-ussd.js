/**
 * USSD Testing Script
 * Tests the USSD voting flow locally without needing a real USSD code
 * 
 * Run with: node scripts/test-ussd.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const sessionID = `test-${Date.now()}`;
const msisdn = '233552732025';
const baseURL = 'http://ockc848ksk4o8k888wow0osc.84.46.246.78.sslip.io/api/ussd/vote';

let isNewSession = true;
let userData = '';

async function sendUSSDRequest(input) {
  try {
    const response = await fetch(baseURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionID,
        userID: 'CP9VG7Y5TN_dNri2',
        newSession: isNewSession,
        msisdn,
        userData: input,
        network: 'MTN'
      })
    });

    const data = await response.json();
    isNewSession = false;
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function startUSSDSession() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     USSD VOTING TEST - PawaVotes      ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('Testing USSD endpoint:', baseURL);
  console.log('Phone Number:', msisdn);
  console.log('Session ID:', sessionID);
  console.log('\n' + '─'.repeat(40) + '\n');

  // Initial request
  const initialResponse = await sendUSSDRequest('');
  
  if (!initialResponse) {
    console.log('❌ Failed to connect to USSD endpoint');
    console.log('Make sure your Next.js server is running: pnpm dev');
    rl.close();
    return;
  }

  console.log(initialResponse.message);
  console.log('\n' + '─'.repeat(40) + '\n');

  if (!initialResponse.continueSession) {
    console.log('Session ended.');
    rl.close();
    return;
  }

  // Interactive loop
  const askForInput = () => {
    rl.question('Enter your choice (or "exit" to quit): ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('\nExiting USSD test...');
        rl.close();
        return;
      }

      console.log('\n' + '─'.repeat(40) + '\n');
      
      const response = await sendUSSDRequest(input);
      
      if (!response) {
        console.log('❌ Request failed');
        rl.close();
        return;
      }

      console.log(response.message);
      console.log('\n' + '─'.repeat(40) + '\n');

      if (!response.continueSession) {
        console.log('✓ Session ended.');
        rl.close();
        return;
      }

      askForInput();
    });
  };

  askForInput();
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://ockc848ksk4o8k888wow0osc.84.46.246.78.sslip.io/api/health', {
      method: 'GET'
    }).catch(() => null);

    if (!response) {
      console.log('\n⚠️  Warning: Cannot connect to production server');
      console.log('Make sure your deployment is running\n');
      
      rl.question('Continue anyway? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          startUSSDSession();
        } else {
          console.log('Exiting...');
          rl.close();
        }
      });
    } else {
      startUSSDSession();
    }
  } catch (error) {
    startUSSDSession();
  }
}

console.log('\n🚀 Starting USSD Test...\n');
checkServer();
