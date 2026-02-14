// Test script to check election data in database
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pawavotes';

async function testElectionData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log('');

    // Check elections
    const Election = mongoose.connection.collection('elections');
    const electionCount = await Election.countDocuments();
    console.log(`Elections count: ${electionCount}`);
    
    if (electionCount > 0) {
      const elections = await Election.find({}).limit(5).toArray();
      console.log('\nSample elections:');
      elections.forEach(election => {
        console.log(`  - ${election.title} (ID: ${election._id})`);
        console.log(`    Organization: ${election.organizationId}`);
        console.log(`    Status: ${election.status}`);
        console.log(`    Dates: ${election.startDate} to ${election.endDate}`);
      });
    }

    // Check voters
    const Voter = mongoose.connection.collection('voters');
    const voterCount = await Voter.countDocuments();
    console.log(`\nVoters count: ${voterCount}`);

    // Check candidates
    const Candidate = mongoose.connection.collection('candidates');
    const candidateCount = await Candidate.countDocuments();
    console.log(`Candidates count: ${candidateCount}`);

    // Check categories
    const Category = mongoose.connection.collection('electioncategories');
    const categoryCount = await Category.countDocuments();
    console.log(`Categories count: ${categoryCount}`);

    // Check organizations
    const Organization = mongoose.connection.collection('organizations');
    const orgCount = await Organization.countDocuments();
    console.log(`\nOrganizations count: ${orgCount}`);
    
    if (orgCount > 0) {
      const orgs = await Organization.find({}).limit(5).toArray();
      console.log('\nSample organizations:');
      orgs.forEach(org => {
        console.log(`  - ${org.name} (ID: ${org._id})`);
        console.log(`    Event Type: ${org.eventType}`);
        console.log(`    Email: ${org.email}`);
      });
    }

    await mongoose.connection.close();
    console.log('\nConnection closed.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testElectionData();
