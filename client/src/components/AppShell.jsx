import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, ListItemIcon, ListItemText,
  Divider, useMediaQuery, Chip, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import HomeRounded from '@mui/icons-material/HomeRounded';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import BuildCircleRounded from '@mui/icons-material/BuildCircleRounded';
import BuildCircleOutlined from '@mui/icons-material/BuildCircleOutlined';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import Inventory2Rounded from '@mui/icons-material/Inventory2Rounded';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import TimerRounded from '@mui/icons-material/TimerRounded';
import { useAuth } from '../lib/auth';
import { initials, fmtClock } from '../lib/format';
import { useActiveTimer, useTick } from '../lib/hooks';

export const RAIL_WIDTH = 88;

function navItems(isManager) {
  return isManager
    ? [
        { to: '/', label: 'Shop', icon: DashboardOutlined, activeIcon: DashboardRounded },
        { to: '/work-orders', label: 'Orders', icon: AssignmentOutlined, activeIcon: AssignmentRounded },
        { to: '/equipment', label: 'Equipment', icon: BuildCircleOutlined, activeIcon: BuildCircleRounded },
        { to: '/inventory', label: 'Inventory', icon: Inventory2Outlined, activeIcon: Inventory2Rounded },
        { to: '/reports', label: 'Reports', icon: InsightsOutlined, activeIcon: InsightsRounded },
      ]
    : [
        { to: '/', label: 'Home', icon: HomeOutlined, activeIcon: HomeRounded },
        { to: '/equipment', label: 'Equipment', icon: BuildCircleOutlined, activeIcon: BuildCircleRounded },
        { to: '/work-orders', label: 'My orders', icon: AssignmentOutlined, activeIcon: AssignmentRounded },
      ];
}

function isActive(pathname, to) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

/** M3 navigation destination: icon inside a pill-shaped active indicator, label beneath. */
function NavDestination({ item, active, rail }) {
  const Icon = active ? item.activeIcon : item.icon;
  return (
    <Box
      component={NavLink}
      to={item.to}
      sx={{
        flex: rail ? 'none' : 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
        textDecoration: 'none', color: active ? 'text.primary' : 'text.secondary',
        py: rail ? 0.75 : 1.5, minWidth: 0,
        '&:hover .ind': { bgcolor: active ? 'm3.secondaryContainer' : 'rgba(25,29,24,0.08)' },
      }}
    >
      <Box
        className="ind"
        sx={{
          width: 56, height: 32, borderRadius: 999, display: 'grid', placeItems: 'center',
          bgcolor: active ? 'm3.secondaryContainer' : 'transparent', transition: 'background-color .2s',
          color: active ? 'm3.onSecondaryContainer' : 'inherit',
        }}
      >
        <Icon fontSize="small" sx={{ fontSize: 24 }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: active ? 600 : 500, fontSize: 12, lineHeight: 1.2 }} noWrap>
        {item.label}
      </Typography>
    </Box>
  );
}

function TimerChip() {
  const timer = useActiveTimer();
  const navigate = useNavigate();
  useTick(!!timer);
  if (!timer) return null;
  const secs = (Date.now() - new Date(timer.started_at).getTime()) / 1000;
  return (
    <Tooltip title={`Clocked in: ${timer.wo?.title || ''}`}>
      <Chip
        icon={<TimerRounded />}
        label={<span><b>#{timer.work_order_id}</b> · {fmtClock(secs)}</span>}
        onClick={() => navigate(`/work-orders/${timer.work_order_id}`)}
        sx={{
          bgcolor: 'm3.primaryContainer', color: 'm3.onPrimaryContainer', fontVariantNumeric: 'tabular-nums',
          '& .MuiChip-icon': { color: 'secondary.dark', animation: 'pulse 1.6s ease-in-out infinite' },
          '@keyframes pulse': { '50%': { opacity: 0.35 } },
        }}
      />
    </Tooltip>
  );
}

export default function AppShell({ children }) {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));
  const { profile, isManager, signOut } = useAuth();
  const { pathname } = useLocation();
  const [menuEl, setMenuEl] = useState(null);
  const items = navItems(isManager);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      {wide && (
        <Box
          component="nav"
          sx={{
            position: 'fixed', inset: '0 auto 0 0', width: RAIL_WIDTH, zIndex: 1200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, pt: 1.5,
            bgcolor: 'm3.surface',
          }}
        >
          <Box component="img" src="/icon.svg" alt="" sx={{ width: 44, height: 44, mb: 3, borderRadius: 3 }} />
          {items.map((it) => (
            <NavDestination key={it.to} item={it} rail active={isActive(pathname, it.to)} />
          ))}
        </Box>
      )}

      <AppBar position="sticky" sx={{ pl: wide ? `${RAIL_WIDTH}px` : 0 }}>
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 64 } }}>
          <Box component="img" src="/logo.png" alt="Cory's Lawn Service" sx={{ height: { xs: 34, sm: 40 } }} />
          <Typography
            sx={{
              display: { xs: 'none', sm: 'block' }, fontFamily: 'Jost', fontWeight: 500, fontSize: 20,
              color: 'text.secondary', pl: 1.5, ml: 0.5, borderLeft: 1, borderColor: 'divider', lineHeight: '28px',
            }}
          >
            Shop
          </Typography>
          <Box sx={{ flex: 1 }} />
          {isManager && <TimerChip />}
          <IconButton onClick={(e) => setMenuEl(e.currentTarget)} aria-label="Account" sx={{ p: 0.5 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 15, fontWeight: 500 }}>
              {initials(profile?.full_name)}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={menuEl}
            open={!!menuEl}
            onClose={() => setMenuEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { borderRadius: 4, minWidth: 240, mt: 1 } } }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography fontWeight={500}>{profile?.full_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                @{profile?.username} · {profile?.role === 'manager' ? 'Shop manager' : profile?.role === 'admin' ? 'Admin' : 'Field tech'}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setMenuEl(null); signOut(); }}>
              <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
              <ListItemText>Sign out</ListItemText>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          pl: wide ? `${RAIL_WIDTH}px` : 0,
          pb: wide ? 4 : 'calc(96px + env(safe-area-inset-bottom))',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, pt: { xs: 1, sm: 2 } }}>{children}</Box>
      </Box>

      {!wide && (
        <Box
          component="nav"
          sx={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1200, display: 'flex',
            bgcolor: 'm3.surfaceContainer', pb: 'env(safe-area-inset-bottom)',
          }}
        >
          {items.map((it) => (
            <NavDestination key={it.to} item={it} active={isActive(pathname, it.to)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
