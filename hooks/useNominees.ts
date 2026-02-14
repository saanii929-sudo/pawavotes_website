import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Nominee {
  _id: string;
  categoryId: string;
  awardId: string;
  name: string;
  email: string;
  voteCount: number;
  status: 'draft' | 'published' | 'accepted' | 'rejected' | 'cancelled';
  nominationStatus: 'pending' | 'accepted' | 'rejected';
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseNomineesOptions {
  categoryId?: string;
  awardId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useNominees = (options?: UseNomineesOptions) => {
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNominees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getNominees({
        categoryId: options?.categoryId,
        awardId: options?.awardId,
        page: options?.page,
        limit: options?.limit,
      });
      setNominees(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch nominees');
      console.error('Error fetching nominees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchNominees();
    }
  }, [options?.categoryId, options?.awardId, options?.page, options?.limit]);

  const createNominee = async (data: any) => {
    try {
      const response = await ApiClient.createNominee(data);
      setNominees([...nominees, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const updateNominee = async (id: string, data: any) => {
    try {
      const response = await ApiClient.updateNominee(id, data);
      setNominees(nominees.map(n => n._id === id ? response.data : n));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteNominee = async (id: string) => {
    try {
      await ApiClient.deleteNominee(id);
      setNominees(nominees.filter(n => n._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    nominees,
    loading,
    error,
    fetchNominees,
    createNominee,
    updateNominee,
    deleteNominee,
  };
};
