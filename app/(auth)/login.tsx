import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
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
import { signInWithEmail } from '@/src/features/auth/authService';
import {
  loginSchema,
  type LoginFormValues,
} from '@/src/features/auth/schemas';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { appAlert } from '@/src/shared/ui/appAlert';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { brandGradient, palette } from '@/src/shared/ui/theme';

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
      appAlert.error('Erro ao entrar', message);
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
            <VStack space="lg" className="items-center">
              <View accessible={false}>
                <AuraOrb
                  size={84}
                  colors={brandGradient}
                  glowColor={palette.primary}
                  intensity={0.15}
                />
              </View>
              <VStack space="xs" className="items-center">
                <Text className="text-xs uppercase tracking-[4px] text-muted-foreground font-grotesk-semibold">
                  Medidor de Aura
                </Text>
                <Heading size="3xl" className="text-center text-foreground">
                  Entre no campo
                </Heading>
                <Text className="text-center text-muted-foreground">
                  Sua aura está esperando para ser medida
                </Text>
              </VStack>
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
            </VStack>

            <GradientButton
              title={submitting ? 'Entrando…' : 'Entrar'}
              onPress={onSubmit}
              loading={submitting}
            />

            <Text className="text-center text-muted-foreground">
              Não tem conta?{' '}
              <Link href="/(auth)/register" className="text-primary">
                Criar conta
              </Link>
            </Text>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
