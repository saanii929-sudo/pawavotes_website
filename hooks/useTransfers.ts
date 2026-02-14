import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Transfer {
  _id: string;
  awardId: string;
  initiatedBy: string;
  referenceId: string;
  recipientName: string;
  recipientBank: string;
  recipientAccountNumber: string;
  recipientPhoneNumber: string;
  amount: number;
  transferType: 'bank' | 'momo';
  status: 'pending' | 'completed' | 'failed';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface UseTransfersOptions {
  awardId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useTransfers = (options?: UseTransfersOptions) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getTransfers({
        awardId: options?.awardId,
        page: options?.page,
        limit: options?.limit,
      });
      setTransfers(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transfers');
      console.error('Error fetching transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchTransfers();
    }
  }, [options?.awardId, options?.page, options?.limit]);

  const createTransfer = async (data: any) => {
    try {
      const response = await ApiClient.createTransfer(data);
      setTransfers([...transfers, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    transfers,
    loading,
    error,
    fetchTransfers,
    createTransfer,
  };
};
