import { useState } from 'react';
import { Box, Card, TextField, Button, Typography, Alert, IconButton, InputAdornment, Stack } from '@mui/material';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import { useAuth } from '../lib/auth';

export default function Login({ noProfile }) {
  const { signIn, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('Enter your username and password.');
    setBusy(true); setError(null);
    try { await signIn(username, password); }
    catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2,
        background: (t) => `radial-gradient(1200px 600px at 10% -10%, ${t.palette.m3.primaryContainer} 0%, transparent 60%),
                           radial-gradient(900px 500px at 110% 110%, ${t.palette.brand.mint} 0%, transparent 60%), ${t.palette.m3.surface}`,
      }}
    >
      <Card component="form" onSubmit={submit} sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 5 }, borderRadius: 7, border: 0, boxShadow: '0 1px 2px rgba(0,0,0,.08), 0 8px 32px rgba(15,66,41,.08)' }}>
        <Box component="img" src="/logo.png" alt="Cory's Lawn Service" sx={{ height: 56, display: 'block', mb: 3 }} />
        <Typography variant="h4" component="h1">Sign in</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>to the equipment shop</Typography>
        {noProfile && (
          <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={signOut}>Sign out</Button>}>
            Your login works but has no shop profile yet. Ask Zach to finish setting up your account.
          </Alert>
        )}
        <Stack spacing={2}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
          />
          <TextField
            label="Password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow(!show)} edge="end" aria-label={show ? 'Hide password' : 'Show password'}>
                      {show ? <VisibilityOffRounded /> : <VisibilityRounded />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ minWidth: 120 }}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
