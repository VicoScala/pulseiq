import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fitiqApi } from '../api/client';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fitiqApi.getMe,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const logout = useMutation({
    mutationFn: fitiqApi.logout,
    onSuccess: () => {
      qc.clear();
      navigate('/login');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
    emailVerified: !!user?.email_verified,
    whoopLinked: !!user?.whoop_linked,
    logout,
  };
}

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (full: boolean) => fitiqApi.triggerSync(full),
    onSuccess: () => setTimeout(() => qc.invalidateQueries(), 5000),
  });
}
