import { useEffect, useState, useCallback, useRef, createContext, useContext, createElement } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { getActiveTimer } from './api';

/** Simple async loader: const { data, loading, error, reload } = useLoad(fn, deps) */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (my === seq.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (my === seq.current) setState((s) => ({ ...s, loading: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

/** Re-render every second while `on`. */
export function useTick(on = true, ms = 1000) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
}

/** Call `onChange` when any of the given tables change (Supabase Realtime). */
export function useRealtime(tables, onChange) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = tables.join(',');
  useEffect(() => {
    let t;
    const ch = supabase.channel(`rt-${key}-${Math.random().toString(36).slice(2)}`);
    for (const table of tables) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(t);
        t = setTimeout(() => cb.current(), 300);
      });
    }
    ch.subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

// ---- Active labor timer (shared app-wide so every screen agrees) ----
const TimerContext = createContext({ timer: null, refresh: () => {} });

export function TimerProvider({ children }) {
  const { user, isManager } = useAuth();
  const [timer, setTimer] = useState(null);
  const refresh = useCallback(async () => {
    if (!user || !isManager) return setTimer(null);
    try { setTimer(await getActiveTimer(user.id)); } catch { /* offline */ }
  }, [user, isManager]);
  useEffect(() => { refresh(); }, [refresh]);
  useRealtime(['time_entries'], refresh);
  return createElement(TimerContext.Provider, { value: { timer, refresh } }, children);
}
export const useActiveTimer = () => useContext(TimerContext).timer;
export const useRefreshTimer = () => useContext(TimerContext).refresh;

// ---- Snackbar ----
const ToastContext = createContext(() => {});
export const ToastProvider = ToastContext.Provider;
export const useToast = () => useContext(ToastContext);
