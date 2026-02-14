/**
 * Script to initialize the first superadmin account
 * Run with: npx ts-node scripts/init-superadmin.ts
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function initSuperAdmin() {
  console.log('\n🚀 Pawavotes SuperAdmin Initialization\n');

  const username = await question('Enter username: ');
  const email = await question('Enter email: ');
  const password = await question('Enter password: ');

  if (!username || !email || !password) {
    console.error('❌ All fields are required');
    rl.close();
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/api/superadmin/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ SuperAdmin created successfully!');
      console.log(`Username: ${data.data.username}`);
      console.log(`Email: ${data.data.email}`);
      console.log(`\nYou can now login at: http://localhost:3000/superadmin/login\n`);
    } else {
      console.error(`\n❌ Error: ${data.error}\n`);
    }
  } catch (error: any) {
    console.error(`\n❌ Failed to create superadmin: ${error.message}\n`);
  }

  rl.close();
}

initSuperAdmin();
