import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Award {
  _id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'voting' | 'completed' | 'cancelled';
  votingCost: number;
  categories?: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseAwardsOptions {
  organizationId?: string;
  status?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useAwards = (options?: UseAwardsOptions) => {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAwards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getAwards({
        organizationId: options?.organizationId,
        status: options?.status,
        page: options?.page,
        limit: options?.limit,
      });
      setAwards(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch awards');
      console.error('Error fetching awards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchAwards();
    }
  }, [options?.organizationId, options?.status, options?.page, options?.limit]);

  const createAward = async (data: any) => {
    try {
      const response = await ApiClient.createAward(data);
      setAwards([...awards, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const updateAward = async (id: string, data: any) => {
    try {
      const response = await ApiClient.updateAward(id, data);
      setAwards(awards.map(a => a._id === id ? response.data : a));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteAward = async (id: string) => {
    try {
      await ApiClient.deleteAward(id);
      setAwards(awards.filter(a => a._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  const publishAward = async (id: string) => {
    try {
      const response = await ApiClient.publishAward(id);
      setAwards(awards.map(a => a._id === id ? response.data : a));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  return {
    awards,
    loading,
    error,
    fetchAwards,
    createAward,
    updateAward,
    deleteAward,
    publishAward,
  };
};
