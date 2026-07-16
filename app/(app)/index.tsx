import { Alert, useColorScheme } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { signOut } from '@/src/features/auth/authService';
import { useSessionHealth } from '@/src/shared/api/useSessionHealth';
import { ThemeToggle } from '@/src/shared/ui/ThemeToggle';

export default function HomeScreen() {
  const user = useAppSelector(selectAuthUser);
  const health = useSessionHealth();
  const colorScheme = useColorScheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível sair';
      Alert.alert('Erro', message);
    }
  };

  return (
    <Box className="flex-1 bg-background px-6 justify-center">
      <VStack space="lg">
        <VStack space="sm">
          <Heading size="2xl" className="text-foreground">
            Olá
          </Heading>
          <Text className="text-muted-foreground">
            {user?.email ?? 'Usuário autenticado'}
          </Text>
          <Text className="text-sm text-muted-foreground">
            Tema ativo: {colorScheme === 'dark' ? 'escuro' : 'claro'}
          </Text>
          <Text className="text-sm text-muted-foreground">
            API health:{' '}
            {health.isLoading
              ? 'checando…'
              : health.data?.ok
                ? 'ok'
                : 'indisponível (esperado até configurar backend)'}
          </Text>
        </VStack>

        <VStack space="sm">
          <Text className="text-sm font-medium text-foreground">Aparência</Text>
          <ThemeToggle />
        </VStack>

        <Button variant="outline" onPress={handleSignOut}>
          <ButtonText>Sair</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
