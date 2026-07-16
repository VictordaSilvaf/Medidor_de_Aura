import type { AnalysisStatus } from '@/src/features/video-analysis/types';
import { palette } from '@/src/shared/ui/theme';

/** Cor do score conforme magnitude (efeito “game”). */
export function scoreColor(score: number): string {
  if (score >= 900) return '#A855F7';
  if (score >= 700) return '#FB7185';
  if (score >= 500) return '#FACC15';
  if (score >= 300) return '#10B981';
  if (score >= 150) return '#38BDF8';
  return '#94A3B8';
}

export function statusLabel(status: AnalysisStatus): string {
  switch (status) {
    case 'pending_upload':
      return 'Enviando';
    case 'uploaded':
      return 'Recebido';
    case 'queued':
      return 'Na fila';
    case 'processing':
      return 'Analisando';
    case 'completed':
      return 'Pronto';
    case 'failed':
      return 'Falhou';
    default:
      return status;
  }
}

export function statusColor(status: AnalysisStatus): string {
  switch (status) {
    case 'completed':
      return palette.success;
    case 'failed':
      return palette.error;
    case 'processing':
    case 'queued':
      return palette.warning;
    default:
      return palette.textDisabled;
  }
}
