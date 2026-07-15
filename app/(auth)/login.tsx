import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useState } from 'react';

import { Box } from '@/components/ui/box';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { signInWithEmail } from '@/src/features/auth/authService';
import {
  loginSchema,
  type LoginFormValues,
} from '@/src/features/auth/schemas';

export default function LoginScreen() {
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await signInWithEmail(values.email.trim(), values.password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível entrar';
      Alert.alert('Erro ao entrar', message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Box className="flex-1 justify-center px-6">
        <VStack space="xl">
          <VStack space="sm">
            <Heading size="2xl" className="text-foreground">
              Medidor de Aura
            </Heading>
            <Text className="text-muted-foreground">
              Entre para continuar
            </Text>
          </VStack>

          <VStack space="md">
            <FormControl isInvalid={!!errors.email}>
              <FormControlLabel>
                <FormControlLabelText>E-mail</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input>
                    <InputField
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                      placeholder="voce@email.com"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </Input>
                )}
              />
              {errors.email ? (
                <FormControlError>
                  <FormControlErrorText>
                    {errors.email.message}
                  </FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormControlLabel>
                <FormControlLabelText>Senha</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input>
                    <InputField
                      secureTextEntry
                      autoCapitalize="none"
                      placeholder="••••••••"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                  </Input>
                )}
              />
              {errors.password ? (
                <FormControlError>
                  <FormControlErrorText>
                    {errors.password.message}
                  </FormControlErrorText>
                </FormControlError>
              ) : null}
            </FormControl>
          </VStack>

          <Button onPress={onSubmit} disabled={submitting}>
            {submitting ? <ButtonSpinner /> : null}
            <ButtonText>{submitting ? 'Entrando…' : 'Entrar'}</ButtonText>
          </Button>

          <Text className="text-center text-muted-foreground">
            Não tem conta?{' '}
            <Link href="/(auth)/register" className="text-primary">
              Criar conta
            </Link>
          </Text>
        </VStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
