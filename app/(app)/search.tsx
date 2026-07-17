import { Redirect } from 'expo-router';

/** Compat: busca agora vive na tab bar. */
export default function SearchRedirect() {
  return <Redirect href="/(app)/(tabs)/search" />;
}
