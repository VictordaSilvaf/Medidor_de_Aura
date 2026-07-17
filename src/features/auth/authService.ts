import {
  clearSession,
  setAuthLoading,
  setSession,
} from '@/src/features/auth/authSlice';
import { supabase } from '@/src/features/auth/supabase';
import type { AppDispatch } from '@/src/core/store';
import { bootstrapProfile } from '@/src/features/social/profileApi';
import { setMyProfile } from '@/src/features/social/profileSlice';
import { registerPushTokenForUser } from '@/src/features/video-analysis/pushNotifications';
import { bootstrapMonetization } from '@/src/features/monetization/monetizationBootstrap';

export async function bootstrapAuth(dispatch: AppDispatch) {
  dispatch(setAuthLoading());

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    dispatch(clearSession());
    dispatch(setMyProfile(null));
  } else {
    dispatch(setSession({ session: data.session }));
    if (data.session?.user.id) {
      void registerPushTokenForUser(data.session.user.id);
      void bootstrapProfile(dispatch, data.session.user.id);
      void bootstrapMonetization(dispatch, data.session.user.id);
    } else {
      dispatch(setMyProfile(null));
    }
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    dispatch(setSession({ session }));
    if (session?.user.id) {
      void registerPushTokenForUser(session.user.id);
      void bootstrapProfile(dispatch, session.user.id);
      void bootstrapMonetization(dispatch, session.user.id);
    } else {
      dispatch(setMyProfile(null));
      void bootstrapMonetization(dispatch, undefined);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
