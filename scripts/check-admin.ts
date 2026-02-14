import mongoose from 'mongoose';
import Admin from '../models/Admin';
import { verifyPassword } from '../lib/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pawavotes';

async function checkAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const admin = await Admin.findOne({ email: 'admin@pawavotes.com' });
    
    if (!admin) {
      console.log('❌ No admin found with email: admin@pawavotes.com');
      process.exit(1);
    }

    console.log('✅ Admin found:');
    console.log('  ID:', admin._id);
    console.log('  Username:', admin.username);
    console.log('  Email:', admin.email);
    console.log('  Role:', admin.role);
    console.log('  Status:', admin.status);
    console.log('  Password hash:', admin.password.substring(0, 20) + '...');
    console.log('');

    // Test password
    const testPassword = 'Admin@123';
    console.log('Testing password:', testPassword);
    const isValid = await verifyPassword(testPassword, admin.password);
    console.log('Password valid:', isValid ? '✅ YES' : '❌ NO');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdmin();
