import { Redirect } from 'expo-router';

/** Cold start always enters via animated splash. */
export default function Index() {
  return <Redirect href="/splash" />;
}
