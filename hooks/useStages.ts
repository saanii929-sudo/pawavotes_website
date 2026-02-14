import { useState, useEffect } from 'react';
import ApiClient from '@/lib/api-client';

interface Stage {
  _id: string;
  awardId: string;
  stageType: 'nomination' | 'voting' | 'results';
  name: string;
  order: number;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface UseStagesOptions {
  awardId?: string;
  page?: number;
  limit?: number;
  skip?: boolean;
}

export const useStages = (options?: UseStagesOptions) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiClient.getStages({
        awardId: options?.awardId,
        page: options?.page,
        limit: options?.limit,
      });
      setStages(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stages');
      console.error('Error fetching stages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!options?.skip) {
      fetchStages();
    }
  }, [options?.awardId, options?.page, options?.limit]);

  const createStage = async (data: any) => {
    try {
      const response = await ApiClient.createStage(data);
      setStages([...stages, response.data]);
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const updateStage = async (id: string, data: any) => {
    try {
      const response = await ApiClient.updateStage(id, data);
      setStages(stages.map(s => s._id === id ? response.data : s));
      return response.data;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteStage = async (id: string) => {
    try {
      await ApiClient.deleteStage(id);
      setStages(stages.filter(s => s._id !== id));
    } catch (err: any) {
      throw err;
    }
  };

  return {
    stages,
    loading,
    error,
    fetchStages,
    createStage,
    updateStage,
    deleteStage,
  };
};
