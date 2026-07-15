import { useQuery } from '@tanstack/react-query';

import { api } from '@/src/shared/api/axios';
import { useAppSelector } from '@/src/core/hooks';
import { selectIsAuthenticated } from '@/src/features/auth/authSlice';

/**
 * Placeholder server-state hook. Replace with real profile/me endpoint later.
 * Until a backend route exists, this reflects local auth readiness.
 */
export function useSessionHealth() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return useQuery({
    queryKey: ['session-health'],
    enabled: isAuthenticated,
    queryFn: async () => {
      try {
        await api.get('/rest/v1/', {
          validateStatus: (status) => status < 500,
        });
        return { ok: true as const };
      } catch {
        return { ok: false as const };
      }
    },
  });
}
