import { Autocomplete, TextField, Box, Typography } from '@mui/material';
import { EquipmentAvatar } from './ui';

/**
 * Searchable equipment field. `mine` = Set of equipment ids to group at the top.
 */
export default function EquipmentPicker({ equipment = [], value, onChange, mine, label = 'Equipment', autoFocus, disabled, error, helperText }) {
  const sorted = mine
    ? [...equipment].sort((a, b) => (mine.has(b.id) - mine.has(a.id)) || a.asset_number.localeCompare(b.asset_number))
    : equipment;
  return (
    <Autocomplete
      options={sorted}
      value={value || null}
      disabled={disabled}
      onChange={(_, v) => onChange(v)}
      groupBy={mine ? (o) => (mine.has(o.id) ? 'My equipment' : 'All equipment') : undefined}
      getOptionLabel={(o) => `${o.asset_number} — ${o.name}`}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts, { inputValue }) => {
        const s = inputValue.trim().toLowerCase();
        if (!s) return opts;
        return opts.filter((o) =>
          [o.asset_number, o.name, o.make, o.model, o.category, o.truck, o.serial].some((f) => f && String(f).toLowerCase().includes(s)));
      }}
      renderOption={({ key, ...props }, o) => (
        <Box component="li" key={key} {...props} sx={{ gap: 1.5, py: '8px !important' }}>
          <EquipmentAvatar category={o.category} size={36} />
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={500} noWrap>{o.asset_number} · {o.name}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {[o.make, o.model, o.truck].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} autoFocus={autoFocus} error={error} helperText={helperText}
          placeholder="Search by number, name, make…" />
      )}
      slotProps={{ paper: { sx: { borderRadius: 3, mt: 0.5 } } }}
    />
  );
}
