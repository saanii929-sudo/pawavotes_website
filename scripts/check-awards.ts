import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/pawavotes';

async function checkAwards() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const awardsCollection = db?.collection('awards');
    
    if (awardsCollection) {
      const awards = await awardsCollection.find({}).toArray();
      console.log(`\nℹ️  Found ${awards.length} awards:\n`);
      
      awards.forEach((award, index) => {
        console.log(`Award ${index + 1}:`);
        console.log(`  ID: ${award._id}`);
        console.log(`  Name: ${award.name}`);
        console.log(`  Banner: ${award.banner || 'NOT SET'}`);
        console.log(`  Status: ${award.status}`);
        console.log('---');
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAwards();
