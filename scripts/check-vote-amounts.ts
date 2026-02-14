import mongoose from 'mongoose';
import Vote from '../models/Vote';
import Award from '../models/Award';

async function checkVoteAmounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/pawavotes');
    console.log('Connected to MongoDB');

    // Get all votes
    const votes = await Vote.find({}).lean();
    console.log(`\nTotal votes in database: ${votes.length}`);

    if (votes.length === 0) {
      console.log('No votes found');
      return;
    }

    // Calculate statistics
    const totalVoteCount = votes.reduce((sum, v) => sum + (v.numberOfVotes || 0), 0);
    const totalAmount = votes.reduce((sum, v) => sum + (v.amount || 0), 0);
    const avgAmountPerVote = totalAmount / totalVoteCount;

    console.log(`\nVote Statistics:`);
    console.log(`Total vote count: ${totalVoteCount}`);
    console.log(`Total revenue: GHS ${totalAmount.toFixed(2)}`);
    console.log(`Average amount per vote: GHS ${avgAmountPerVote.toFixed(4)}`);

    // Show sample votes
    console.log(`\nSample votes (first 5):`);
    votes.slice(0, 5).forEach((vote, index) => {
      console.log(`${index + 1}. Votes: ${vote.numberOfVotes}, Amount: GHS ${vote.amount}, Per vote: GHS ${(vote.amount / vote.numberOfVotes).toFixed(4)}`);
    });

    // Get award pricing
    const awards = await Award.find({}).select('name pricing').lean();
    console.log(`\nAward Pricing:`);
    awards.forEach(award => {
      console.log(`- ${award.name}: GHS ${award.pricing?.votingCost || 0} per vote`);
    });

    // Check for inconsistencies
    console.log(`\nChecking for inconsistencies...`);
    const inconsistentVotes = votes.filter(vote => {
      const expectedAmount = vote.numberOfVotes * 0.5; // Assuming default 0.5
      const actualAmount = vote.amount;
      const diff = Math.abs(expectedAmount - actualAmount);
      return diff > 0.01; // Allow small rounding differences
    });

    if (inconsistentVotes.length > 0) {
      console.log(`Found ${inconsistentVotes.length} votes with potentially incorrect amounts:`);
      inconsistentVotes.slice(0, 5).forEach((vote, index) => {
        console.log(`${index + 1}. Votes: ${vote.numberOfVotes}, Amount: GHS ${vote.amount}, Expected (at 0.5): GHS ${(vote.numberOfVotes * 0.5).toFixed(2)}`);
      });
    } else {
      console.log('All votes have consistent amounts');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkVoteAmounts();
