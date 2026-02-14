import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://localhost:27017/pawavotes';

async function fixCategoriesField() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const awardsCollection = db?.collection('awards');
    
    if (awardsCollection) {
      const awards = await awardsCollection.find({}).toArray();
      console.log(`\nℹ️  Found ${awards.length} awards to check\n`);
      
      for (const award of awards) {
        // Check if categories is an array
        if (Array.isArray(award.categories)) {
          console.log(`Fixing award: ${award.name}`);
          console.log(`  Current categories field: Array with ${award.categories.length} items`);
          
          // Update to number (count of categories)
          await awardsCollection.updateOne(
            { _id: award._id },
            { $set: { categories: award.categories.length } }
          );
          
          console.log(`  ✅ Updated to: ${award.categories.length} (number)`);
        } else if (typeof award.categories === 'number') {
          console.log(`Award "${award.name}" already has categories as number: ${award.categories}`);
        } else {
          console.log(`Award "${award.name}" has no categories field, setting to 0`);
          await awardsCollection.updateOne(
            { _id: award._id },
            { $set: { categories: 0 } }
          );
        }
      }
    }
    
    console.log('\n✅ All awards fixed!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCategoriesField();
