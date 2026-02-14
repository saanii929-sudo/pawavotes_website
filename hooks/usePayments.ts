import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Payment {
  _id: string;
  nomineeId: string;
  awardId: string;
  transactionId: string;
  paymentMethod: 'mobile_money' | 'bank_transfer' | 'card' | 'manual';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

interface UsePaymentsOptions {
  awardId?: string;
  nomineeId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const usePayments = (options?: UsePaymentsOptions) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getPayments({
        awardId: options?.awardId,
        nomineeId: options?.nomineeId,
        page: options?.page,
        limit: options?.limit,
      });
      setPayments(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments');
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchPayments();
    }
  }, [options?.awardId, options?.nomineeId, options?.page, options?.limit]);

  const createPayment = async (data: any) => {
    try {
      const response = await ApiClient.createPayment(data);
      setPayments([...payments, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    payments,
    loading,
    error,
    fetchPayments,
    createPayment,
  };
};
