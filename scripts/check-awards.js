/**
 * Check Awards Script
 * Checks awards in database and their voting dates
 * 
 * Run with: node scripts/check-awards.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Use the MONGODB_URI from .env.local
const MONGODB_URI = process.env.MONGODB_URI;

// Award Schema
const AwardSchema = new mongoose.Schema({
  name: String,
  status: String,
  votingStartDate: Date,
  votingEndDate: Date,
  votingStartTime: String,
  votingEndTime: String,
  settings: {
    allowPublicVoting: Boolean,
    showResults: Boolean,
  },
}, { timestamps: true });

async function checkAwards() {
  try {
    console.log('\n🔍 Checking Awards in Database...\n');
    
    if (!MONGODB_URI) {
      console.log('❌ MONGODB_URI not found in .env.local');
      console.log('Please set MONGODB_URI in your .env.local file\n');
      return;
    }
    
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Award = mongoose.models.Award || mongoose.model('Award', AwardSchema);
    
    const awards = await Award.find({}).lean();
    
    console.log(`Found ${awards.length} total awards\n`);
    console.log('═'.repeat(60));

    if (awards.length === 0) {
      console.log('\n❌ No awards found in database!');
      console.log('\nCreate an award first through the web interface:');
      console.log('  http://localhost:3000/dashboard/awards\n');
      await mongoose.disconnect();
      return;
    }

    const now = new Date();
    console.log(`\nCurrent Time: ${now.toISOString()}\n`);

    awards.forEach((award, index) => {
      console.log(`\n${index + 1}. ${award.name}`);
      console.log('─'.repeat(60));
      console.log(`   ID: ${award._id}`);
      console.log(`   Status: ${award.status || 'NOT SET'}`);
      console.log(`   Created: ${award.createdAt ? award.createdAt.toISOString() : 'N/A'}`);
      console.log(`\n   Voting Period:`);
      console.log(`   - Start Date: ${award.votingStartDate || 'NOT SET'}`);
      console.log(`   - End Date: ${award.votingEndDate || 'NOT SET'}`);
      console.log(`   - Start Time: ${award.votingStartTime || 'NOT SET'}`);
      console.log(`   - End Time: ${award.votingEndTime || 'NOT SET'}`);
      
      console.log(`\n   Settings:`);
      console.log(`   - Allow Public Voting: ${award.settings?.allowPublicVoting ?? 'NOT SET'}`);
      console.log(`   - Show Results: ${award.settings?.showResults ?? 'NOT SET'}`);

      // Check if voting is active
      let isActive = false;
      let reason = '';

      if (award.status !== 'published') {
        reason = `Status is "${award.status}" (needs to be "published")`;
      } else if (!award.votingStartDate || !award.votingEndDate) {
        reason = 'Voting dates not set';
      } else {
        const start = new Date(award.votingStartDate);
        const end = new Date(award.votingEndDate);

        if (award.votingStartTime) {
          const [hours, minutes] = award.votingStartTime.split(':');
          start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (award.votingEndTime) {
          const [hours, minutes] = award.votingEndTime.split(':');
          end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (now < start) {
          reason = `Voting hasn't started yet (starts ${start.toISOString()})`;
        } else if (now > end) {
          reason = `Voting has ended (ended ${end.toISOString()})`;
        } else {
          isActive = true;
          reason = `Active (${start.toISOString()} to ${end.toISOString()})`;
        }
      }

      console.log(`\n   ${isActive ? '✅' : '❌'} USSD Status: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`   Reason: ${reason}`);
    });

    console.log('\n' + '═'.repeat(60));
    
    const publishedAwards = awards.filter(a => a.status === 'published');
    const activeAwards = awards.filter(a => {
      if (a.status !== 'published') return false;
      if (!a.votingStartDate || !a.votingEndDate) return false;
      
      const start = new Date(a.votingStartDate);
      const end = new Date(a.votingEndDate);
      
      if (a.votingStartTime) {
        const [hours, minutes] = a.votingStartTime.split(':');
        start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      if (a.votingEndTime) {
        const [hours, minutes] = a.votingEndTime.split(':');
        end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      return now >= start && now <= end;
    });

    console.log('\n📊 Summary:');
    console.log(`   Total Awards: ${awards.length}`);
    console.log(`   Published: ${publishedAwards.length}`);
    console.log(`   Active for USSD: ${activeAwards.length}`);

    if (activeAwards.length === 0) {
      console.log('\n⚠️  No awards are currently active for USSD voting!');
      console.log('\n💡 To fix this:');
      console.log('   1. Go to: http://localhost:3000/dashboard/awards');
      console.log('   2. Edit your award');
      console.log('   3. Set Status to "published"');
      console.log('   4. Set Voting Start Date (past or today)');
      console.log('   5. Set Voting End Date (future)');
      console.log('   6. Save the award\n');
    } else {
      console.log('\n✅ Awards ready for USSD voting!');
      console.log('   You can now test with: node scripts/test-ussd.js\n');
    }

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAwards();
