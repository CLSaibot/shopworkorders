import { createTheme, alpha } from '@mui/material/styles';
import '@fontsource/jost/latin-500.css';
import '@fontsource/jost/latin-600.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-500.css';

// Brand colors pulled from coryslawnservice.com (Elementor global palette),
// mapped onto Material Design 3 color roles.
export const brand = {
  forest: '#05321D',      // darkest brand green
  pine: '#0F4229',        // primary brand green
  leaf: '#4AB21F',        // bright accent green
  moss: '#467C45',
  mint: '#E7F3E7',        // light brand green surface
  mist: '#E7ECE8',        // neutral brand surface
  text: '#383838',
};

const m3 = {
  primary: brand.pine,
  onPrimary: '#FFFFFF',
  primaryContainer: '#C9EBC4',
  onPrimaryContainer: brand.forest,
  secondaryContainer: '#D4E8D0',
  onSecondaryContainer: '#0F1F10',
  surface: '#F6FAF4',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F0F5EE',
  surfaceContainer: '#EAF0E8',
  surfaceContainerHigh: brand.mist,
  surfaceContainerHighest: '#DEE5DC',
  onSurface: '#191D18',
  onSurfaceVariant: '#424940',
  outline: '#72796F',
  outlineVariant: '#C2C9BD',
};

const heading = '"Jost", "Google Sans", "Rubik", system-ui, sans-serif';
const body = '"Rubik", "Roboto", system-ui, sans-serif';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: m3.primary, dark: brand.forest, light: '#2E6B47', contrastText: m3.onPrimary },
    secondary: { main: brand.leaf, dark: '#2F8A0F', contrastText: '#FFFFFF' },
    success: { main: '#2E7D32' },
    warning: { main: '#B26A00' },
    error: { main: '#BA1A1A' },
    info: { main: '#1F5FA8' },
    background: { default: m3.surface, paper: m3.surfaceContainerLowest },
    text: { primary: m3.onSurface, secondary: m3.onSurfaceVariant },
    divider: m3.outlineVariant,
    m3,
    brand,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: body,
    h1: { fontFamily: heading, fontWeight: 600 },
    h2: { fontFamily: heading, fontWeight: 600 },
    h3: { fontFamily: heading, fontWeight: 600, fontSize: '2rem' },
    h4: { fontFamily: heading, fontWeight: 600, fontSize: '1.75rem', letterSpacing: 0 },
    h5: { fontFamily: heading, fontWeight: 600, fontSize: '1.4rem' },
    h6: { fontFamily: heading, fontWeight: 600, fontSize: '1.15rem' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    button: { fontWeight: 500, textTransform: 'none', letterSpacing: '0.01em' },
    overline: { fontWeight: 500, letterSpacing: '0.08em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: m3.surface, WebkitTapHighlightColor: 'transparent' },
        'input[type=number]': { MozAppearance: 'textfield' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 20, minHeight: 40 },
        sizeLarge: { minHeight: 48, paddingInline: 24, fontSize: '1rem' },
        sizeSmall: { minHeight: 32, paddingInline: 14 },
        outlined: { borderColor: m3.outline },
      },
      variants: [
        {
          props: { variant: 'tonal' },
          style: {
            backgroundColor: m3.secondaryContainer,
            color: m3.onSecondaryContainer,
            '&:hover': { backgroundColor: '#C3DABF' },
          },
        },
      ],
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,.2), 0 4px 8px 3px rgba(0,0,0,.08)',
        },
        primary: {
          backgroundColor: m3.primaryContainer,
          color: m3.onPrimaryContainer,
          '&:hover': { backgroundColor: '#B4DFAE' },
        },
        extended: { height: 56, paddingInline: 20, gap: 10, fontSize: '0.95rem', fontWeight: 500 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 16, border: `1px solid ${m3.outlineVariant}` } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 16 } } },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 28, backgroundColor: m3.surfaceContainerLow, backgroundImage: 'none' },
        paperFullScreen: { borderRadius: 0 },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: heading, fontWeight: 600, fontSize: '1.4rem', paddingTop: 24 } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '8px 24px 20px', gap: 4 } } },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 12, backgroundColor: m3.surfaceContainerLowest },
        notchedOutline: { borderColor: m3.outline },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
        outlined: { borderColor: m3.outlineVariant },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: 999 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderColor: m3.outline,
          paddingInline: 16,
          '&:first-of-type': { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
          '&:last-of-type': { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
          '&.Mui-selected': {
            backgroundColor: m3.secondaryContainer,
            color: m3.onSecondaryContainer,
            '&:hover': { backgroundColor: '#C3DABF' },
          },
        },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: { root: { backgroundColor: m3.surface } },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500, minHeight: 48 } } },
    MuiListItemButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 500, color: m3.onSurfaceVariant, backgroundColor: m3.surfaceContainerLow },
        root: { borderColor: m3.outlineVariant },
      },
    },
    MuiSnackbarContent: { styleOverrides: { root: { borderRadius: 8, backgroundColor: '#2E312D' } } },
    MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: '#2E312D', borderRadius: 6 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4, backgroundColor: alpha(m3.primary, 0.12) } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
  },
});

export default theme;
