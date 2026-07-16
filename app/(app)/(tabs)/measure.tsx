import { Redirect } from 'expo-router';

/** Tab central só redireciona — o press real abre capture via listener. */
export default function MeasureTab() {
  return <Redirect href="/(app)/capture" />;
}
