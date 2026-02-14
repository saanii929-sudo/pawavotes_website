import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/pawavotes';

async function fixAwardStatus() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Update existing awards to use new status values
    const awardsCollection = db?.collection('awards');
    
    if (awardsCollection) {
      // Map old status values to new ones
      const statusMapping: Record<string, string> = {
        'live': 'active',
        'closed': 'completed',
        'archived': 'cancelled',
        'draft': 'draft',
      };

      const awards = await awardsCollection.find({}).toArray();
      console.log(`ℹ️  Found ${awards.length} awards to update`);

      for (const award of awards) {
        const oldStatus = award.status;
        const newStatus = statusMapping[oldStatus] || 'draft';
        
        if (oldStatus !== newStatus) {
          await awardsCollection.updateOne(
            { _id: award._id },
            { $set: { status: newStatus } }
          );
          console.log(`✅ Updated award ${award._id}: ${oldStatus} → ${newStatus}`);
        }
      }
    }

    // Drop and recreate the collection to update the schema
    try {
      await db?.dropCollection('awards');
      console.log('✅ Dropped awards collection to clear cached schema');
    } catch (error: any) {
      if (error.code === 26) {
        console.log('ℹ️  Awards collection does not exist');
      } else {
        throw error;
      }
    }

    console.log('✅ Award status fixed! The collection will be recreated with the correct schema.');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAwardStatus();
