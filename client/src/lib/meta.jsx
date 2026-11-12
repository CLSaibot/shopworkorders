import AgricultureRounded from '@mui/icons-material/AgricultureRounded';
import ContentCutRounded from '@mui/icons-material/ContentCutRounded';
import AirRounded from '@mui/icons-material/AirRounded';
import LocalShippingRounded from '@mui/icons-material/LocalShippingRounded';
import RvHookupRounded from '@mui/icons-material/RvHookupRounded';
import GrassRounded from '@mui/icons-material/GrassRounded';
import StraightenRounded from '@mui/icons-material/StraightenRounded';
import WaterDropRounded from '@mui/icons-material/WaterDropRounded';
import BuildRounded from '@mui/icons-material/BuildRounded';
import BlurOnRounded from '@mui/icons-material/BlurOnRounded';

export const WO_STATUS = {
  submitted:   { label: 'Waiting for check-in', short: 'New', bg: '#FFE7B3', fg: '#5A3D00' },
  checked_in:  { label: 'Checked in',  short: 'Checked in', bg: '#D6E3FF', fg: '#0F2F5C' },
  in_progress: { label: 'In progress', short: 'In progress', bg: '#C9EBC4', fg: '#05321D' },
  paused:      { label: 'Paused',      short: 'Paused', bg: '#FFDCC2', fg: '#5C2A00' },
  completed:   { label: 'Completed',   short: 'Done', bg: '#E2E6DF', fg: '#2A3128' },
  cancelled:   { label: 'Cancelled',   short: 'Cancelled', bg: '#ECEEEA', fg: '#5F655C' },
};
export const OPEN_STATUSES = ['submitted', 'checked_in', 'in_progress', 'paused'];

export const EQ_STATUS = {
  in_service:     { label: 'In service', bg: '#DDF3D6', fg: '#0E3B12' },
  issue_reported: { label: 'Issue reported', bg: '#FFE7B3', fg: '#5A3D00' },
  in_shop:        { label: 'In shop', bg: '#D6E3FF', fg: '#0F2F5C' },
  out_of_service: { label: 'Out of service', bg: '#FFDAD6', fg: '#690005' },
  retired:        { label: 'Retired', bg: '#ECEEEA', fg: '#5F655C' },
};

export const PRIORITY = {
  low:    { label: 'Low',    color: '#5F655C' },
  normal: { label: 'Normal', color: '#1F5FA8' },
  high:   { label: 'High',   color: '#B26A00' },
  urgent: { label: 'Urgent', color: '#BA1A1A' },
};

export const PART_SOURCE = {
  shop_stock: 'Shop stock',
  purchased: 'Bought in store',
  online: 'Ordered online',
};

export const UNITS = ['each', 'qt', 'gal', 'L', 'oz', 'ml', 'ft', 'lb', 'set', 'pair'];

export const EQUIPMENT_CATEGORIES = ['Mower', 'Trimmer', 'Blower', 'Edger', 'Aerator', 'Hedge Trimmer', 'Chainsaw',
  'Sprayer', 'Spreader', 'Dethatcher', 'Truck', 'Trailer', 'Other'];

const CATEGORY_ICON = {
  Mower: AgricultureRounded,
  Trimmer: GrassRounded,
  'Hedge Trimmer': ContentCutRounded,
  Blower: AirRounded,
  Edger: StraightenRounded,
  Aerator: BlurOnRounded,
  Sprayer: WaterDropRounded,
  Truck: LocalShippingRounded,
  Trailer: RvHookupRounded,
};
export const categoryIcon = (c) => CATEGORY_ICON[c] || BuildRounded;
