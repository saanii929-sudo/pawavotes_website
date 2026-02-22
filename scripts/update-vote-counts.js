/**
 * Update Vote Counts
 * Recalculates and updates voteCount for all nominees based on actual votes
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const VoteSchema = new mongoose.Schema({
  awardId: mongoose.Schema.Types.ObjectId,
  categoryId: mongoose.Schema.Types.ObjectId,
  nomineeId: mongoose.Schema.Types.ObjectId,
  numberOfVotes: Number,
  paymentStatus: String,
}, { timestamps: true });

const NomineeSchema = new mongoose.Schema({
  name: String,
  nomineeCode: String,
  voteCount: Number,
}, { timestamps: true });

async function updateVoteCounts() {
  try {
    console.log('\n🔄 Updating Vote Counts...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Vote = mongoose.models.Vote || mongoose.model('Vote', VoteSchema);
    const Nominee = mongoose.models.Nominee || mongoose.model('Nominee', NomineeSchema);
    
    // Get all nominees
    const nominees = await Nominee.find({});
    console.log(`Found ${nominees.length} nominees\n`);

    for (const nominee of nominees) {
      // Count votes for this nominee (only completed payments)
      const votes = await Vote.find({
        nomineeId: nominee._id,
        paymentStatus: 'completed'
      });

      const totalVotes = votes.reduce((sum, vote) => sum + (vote.numberOfVotes || 0), 0);

      console.log(`${nominee.name} (${nominee.nomineeCode || 'No code'})`);
      console.log(`  Current voteCount: ${nominee.voteCount}`);
      console.log(`  Actual votes: ${totalVotes}`);

      if (nominee.voteCount !== totalVotes) {
        await Nominee.findByIdAndUpdate(nominee._id, { voteCount: totalVotes });
        console.log(`  ✅ Updated to ${totalVotes}`);
      } else {
        console.log(`  ✓ Already correct`);
      }
      console.log();
    }

    console.log('✅ Vote counts updated successfully!\n');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVoteCounts();
