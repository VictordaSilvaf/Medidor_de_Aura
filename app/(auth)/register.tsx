import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';

import { Box } from '@/components/ui/box';
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
import { signUpWithEmail } from '@/src/features/auth/authService';
import {
  registerSchema,
  type RegisterFormValues,
} from '@/src/features/auth/schemas';
import { appAlert } from '@/src/shared/ui/appAlert';
import { GradientButton } from '@/src/shared/ui/GradientButton';

export default function RegisterScreen() {
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitting(true);
      await signUpWithEmail(values.email.trim(), values.password);
      appAlert.success(
        'Conta criada',
        'Verifique seu e-mail se a confirmação estiver habilitada no Supabase.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível cadastrar';
      appAlert.error('Erro ao cadastrar', message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <Box className="px-6 py-12">
          <VStack space="2xl">
            <VStack space="xs">
              <Text className="text-xs uppercase tracking-[4px] text-muted-foreground font-grotesk-semibold">
                Novo perfil
              </Text>
              <Heading size="3xl" className="text-foreground">
                Criar conta
              </Heading>
              <Text className="text-muted-foreground">
                Comece a farmar aura hoje
              </Text>
            </VStack>

            <VStack space="lg">
              <FormControl isInvalid={!!errors.email}>
                <FormControlLabel>
                  <FormControlLabelText className="font-grotesk-medium">
                    E-mail
                  </FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="min-h-14 rounded-2xl">
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
                  <FormControlLabelText className="font-grotesk-medium">
                    Senha
                  </FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="min-h-14 rounded-2xl">
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

              <FormControl isInvalid={!!errors.confirmPassword}>
                <FormControlLabel>
                  <FormControlLabelText className="font-grotesk-medium">
                    Confirmar senha
                  </FormControlLabelText>
                </FormControlLabel>
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input className="min-h-14 rounded-2xl">
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
                {errors.confirmPassword ? (
                  <FormControlError>
                    <FormControlErrorText>
                      {errors.confirmPassword.message}
                    </FormControlErrorText>
                  </FormControlError>
                ) : null}
              </FormControl>
            </VStack>

            <GradientButton
              title={submitting ? 'Criando…' : 'Criar conta'}
              onPress={onSubmit}
              loading={submitting}
            />

            <Text className="text-center text-muted-foreground">
              Já tem conta?{' '}
              <Link href="/(auth)/login" className="text-primary">
                Entrar
              </Link>
            </Text>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
