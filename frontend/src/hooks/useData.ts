import { useQuery } from '@tanstack/react-query';
import { fitiqApi } from '../api/client';
import type { Period } from '../types/whoop';

const STALE = 5 * 60_000; // 5 minutes

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: fitiqApi.getDashboard, staleTime: STALE });

export const useRecovery = (period: Period) =>
  useQuery({ queryKey: ['recovery', period], queryFn: () => fitiqApi.getRecovery(period), staleTime: STALE });

export const useSleep = (period: Period) =>
  useQuery({ queryKey: ['sleep', period], queryFn: () => fitiqApi.getSleep(period), staleTime: STALE });

export const useCycles = (period: Period) =>
  useQuery({ queryKey: ['cycles', period], queryFn: () => fitiqApi.getCycles(period), staleTime: STALE });

export const useWorkouts = (period: Period) =>
  useQuery({ queryKey: ['workouts', period], queryFn: () => fitiqApi.getWorkouts(period), staleTime: STALE });

export const useInsights = () =>
  useQuery({ queryKey: ['insights'], queryFn: fitiqApi.getInsights, staleTime: STALE });
