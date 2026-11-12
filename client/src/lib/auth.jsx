import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, usernameToEmail, friendlyError } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  const loadProfile = useCallback(async (s) => {
    if (!s) return setProfile(null);
    const { data } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      await loadProfile(data.session);
      setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'SIGNED_OUT') { setProfile(null); setSession(null); }
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(s);
        // Don't await inside the callback (supabase-js deadlock guidance).
        setTimeout(() => loadProfile(s), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (username, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    if (error) throw new Error(friendlyError(error));
    await loadProfile(data.session);
    setSession(data.session);
  };
  const signOut = () => supabase.auth.signOut();

  const isManager = profile?.role === 'manager' || profile?.role === 'admin';
  return (
    <AuthContext.Provider value={{ session, profile, user: session?.user, isManager, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
