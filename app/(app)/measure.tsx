import { Redirect } from 'expo-router';

/** Fluxo antigo de sorteio local — redireciona para captura por vídeo. */
export default function MeasureRedirect() {
  return <Redirect href="/(app)/capture" />;
}
