import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Session, User } from '@supabase/supabase-js';

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

type AuthUser = Pick<User, 'id' | 'email' | 'created_at' | 'user_metadata'>;

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
};

const initialState: AuthState = {
  status: 'idle',
  user: null,
  accessToken: null,
};

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    user_metadata: user.user_metadata,
  };
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state) {
      state.status = 'loading';
    },
    setSession(
      state,
      action: PayloadAction<{ session: Session | null }>,
    ) {
      const session = action.payload.session;
      if (session?.user) {
        state.status = 'authenticated';
        state.user = toAuthUser(session.user);
        state.accessToken = session.access_token;
      } else {
        state.status = 'unauthenticated';
        state.user = null;
        state.accessToken = null;
      }
    },
    clearSession(state) {
      state.status = 'unauthenticated';
      state.user = null;
      state.accessToken = null;
    },
  },
});

export const { setAuthLoading, setSession, clearSession } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectAuthStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectAuthUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }) =>
  state.auth.accessToken;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated';
