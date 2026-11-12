import { StrictMode, useCallback, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Snackbar } from '@mui/material';
import theme from './theme';
import { AuthProvider, useAuth } from './lib/auth';
import { TimerProvider, ToastProvider } from './lib/hooks';
import AppShell from './components/AppShell';
import { Loading } from './components/ui';
import Login from './pages/Login';
import Home from './pages/Home';

const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const WorkOrderDetail = lazy(() => import('./pages/WorkOrderDetail'));
const EquipmentList = lazy(() => import('./pages/EquipmentList'));
const EquipmentDetail = lazy(() => import('./pages/EquipmentDetail'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reports = lazy(() => import('./pages/Reports'));

function ManagerOnly({ children }) {
  const { isManager } = useAuth();
  return isManager ? children : <Navigate to="/" replace />;
}

function Root() {
  const { session, profile } = useAuth();
  if (session === undefined) return <Loading py={20} />;
  if (!session || !profile) return <Login noProfile={!!session && !profile} />;
  return (
    <TimerProvider>
      <AppShell>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/equipment" element={<EquipmentList />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/inventory" element={<ManagerOnly><Inventory /></ManagerOnly>} />
            <Route path="/reports" element={<ManagerOnly><Reports /></ManagerOnly>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </TimerProvider>
  );
}

function App() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg) => setToast({ msg, key: Date.now() }), []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider value={show}>
        <BrowserRouter>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </BrowserRouter>
        <Snackbar
          key={toast?.key}
          open={!!toast}
          autoHideDuration={5000}
          onClose={(_, r) => r !== 'clickaway' && setToast(null)}
          message={toast?.msg}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ bottom: { xs: 96, md: 24 } }}
        />
      </ToastProvider>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
