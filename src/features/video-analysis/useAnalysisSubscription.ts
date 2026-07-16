import { useEffect, useState } from 'react';

import { supabase } from '@/src/features/auth/supabase';

import { fetchAnalysis, fetchAnalysisResult } from './analysisApi';
import type { VideoAnalysis, VideoAnalysisResult } from './types';

export function useAnalysisSubscription(analysisId: string | undefined) {
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!analysisId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const row = await fetchAnalysis(analysisId);
        if (cancelled) return;
        setAnalysis(row);
        if (row.status === 'completed') {
          const res = await fetchAnalysisResult(analysisId);
          if (!cancelled) setResult(res);
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar análise');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    const channel = supabase
      .channel(`analysis:${analysisId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_analyses',
          filter: `id=eq.${analysisId}`,
        },
        (payload) => {
          const row = payload.new as VideoAnalysis;
          setAnalysis(row);
          if (row.status === 'completed') {
            void fetchAnalysisResult(analysisId).then((res) => {
              if (!cancelled) setResult(res);
            });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [analysisId]);

  return { analysis, result, error, loading };
}