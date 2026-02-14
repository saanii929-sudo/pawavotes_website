import BulkVotePackage, { IBulkVotePackage } from '@/models/BulkVotePackage';
import { CreateBulkVotePackageInput, UpdateBulkVotePackageInput } from '@/lib/schemas';
import { AppError } from '@/utils/error-handler';
import connectDB from '@/lib/mongodb';

export class BulkVotePackageService {
  async createPackage(data: CreateBulkVotePackageInput): Promise<IBulkVotePackage> {
    await connectDB();
    
    const pkg = new BulkVotePackage(data);
    return await pkg.save();
  }

  async getPackageById(packageId: string): Promise<IBulkVotePackage> {
    await connectDB();
    
    const pkg = await BulkVotePackage.findById(packageId);
    if (!pkg) {
      throw new AppError(404, 'Package not found');
    }
    
    return pkg;
  }

  async getPackagesByAward(awardId: string, onlyActive = true) {
    await connectDB();
    
    const query: any = { awardId };
    if (onlyActive) {
      query.isActive = true;
    }
    
    return await BulkVotePackage.find(query).sort({ amount: 1 });
  }

  async updatePackage(packageId: string, data: UpdateBulkVotePackageInput): Promise<IBulkVotePackage> {
    await connectDB();
    
    const pkg = await BulkVotePackage.findByIdAndUpdate(packageId, data, {
      new: true,
      runValidators: true,
    });
    
    if (!pkg) {
      throw new AppError(404, 'Package not found');
    }
    
    return pkg;
  }

  async deletePackage(packageId: string): Promise<void> {
    await connectDB();
    
    const result = await BulkVotePackage.findByIdAndDelete(packageId);
    
    if (!result) {
      throw new AppError(404, 'Package not found');
    }
  }

  async deactivatePackage(packageId: string): Promise<IBulkVotePackage> {
    await connectDB();
    
    const pkg = await BulkVotePackage.findByIdAndUpdate(
      packageId,
      { isActive: false },
      { new: true }
    );
    
    if (!pkg) {
      throw new AppError(404, 'Package not found');
    }
    
    return pkg;
  }
}

export const bulkVotePackageService = new BulkVotePackageService();
