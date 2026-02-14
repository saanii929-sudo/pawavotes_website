import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/pawavotes';

async function clearAwards() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const awardsCollection = db?.collection('awards');
    
    if (awardsCollection) {
      const result = await awardsCollection.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} awards`);
    }

    // Also drop the collection to clear schema cache
    try {
      await db?.dropCollection('awards');
      console.log('✅ Dropped awards collection');
    } catch (error: any) {
      if (error.code === 26) {
        console.log('ℹ️  Awards collection already dropped');
      }
    }

    console.log('✅ All awards cleared! You can now create new awards with the correct schema.');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAwards();
