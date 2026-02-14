import mongoose from 'mongoose';
import Admin from '../models/Admin';
import { hashPassword } from '../lib/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pawavotes';

async function resetPassword() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const newPassword = 'admin123';
    const hashedPassword = await hashPassword(newPassword);

    const result = await Admin.updateOne(
      { email: 'admin@pawavotes.com' },
      { $set: { password: hashedPassword } }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successfully!');
      console.log('');
      console.log('New credentials:');
      console.log('  Email: admin@pawavotes.com');
      console.log('  Password: admin123');
      console.log('');
    } else {
      console.log('❌ Admin not found or password unchanged');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetPassword();
