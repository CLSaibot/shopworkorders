import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, IconButton, Typography, Dialog, Stack, CircularProgress, Tooltip, Alert,
} from '@mui/material';
import AddAPhotoRounded from '@mui/icons-material/AddAPhotoRounded';
import VideocamRounded from '@mui/icons-material/VideocamRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import PlayCircleFilledRounded from '@mui/icons-material/PlayCircleFilledRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import InsertDriveFileRounded from '@mui/icons-material/InsertDriveFileRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { signedUrls, validateFile } from '../lib/api';
import { fmtBytes, fmtDateTime } from '../lib/format';

const isImage = (mime = '') => mime.startsWith('image/');
const isVideo = (mime = '') => mime.startsWith('video/');

/** Hidden file input + button. */
export function FilePickButton({ accept, label, icon, onFiles, variant = 'tonal', multiple = true, disabled, size }) {
  const ref = useRef();
  return (
    <>
      <Button variant={variant} startIcon={icon} onClick={() => ref.current?.click()} disabled={disabled} size={size}>
        {label}
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

/** Local (not yet uploaded) files with previews — used in the report-issue form. */
export function PendingFiles({ files, onRemove, status = {} }) {
  const previews = useMemo(() => files.map((f) => ({ f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);
  if (!files.length) return null;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1, mt: 1.5 }}>
      {previews.map(({ f, url }, i) => (
        <Box key={url} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 3, overflow: 'hidden', bgcolor: 'm3.surfaceContainerHigh' }}>
          {isImage(f.type) ? (
            <Box component="img" src={url} alt={f.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : isVideo(f.type) ? (
            <>
              <Box component="video" src={url} muted playsInline preload="metadata" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <PlayCircleFilledRounded sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 36, color: 'white', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.5))' }} />
            </>
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', p: 1 }}>
              <InsertDriveFileRounded color="action" />
              <Typography variant="caption" noWrap sx={{ maxWidth: '100%' }}>{f.name}</Typography>
            </Stack>
          )}
          <Typography variant="caption" sx={{ position: 'absolute', left: 6, bottom: 4, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,.8)' }}>
            {fmtBytes(f.size)}
          </Typography>
          {status[i] === 'uploading' && (
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={28} sx={{ color: 'white' }} />
            </Box>
          )}
          {status[i] === 'done' && (
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(15,66,41,.35)' }} />
          )}
          {!status[i] && onRemove && (
            <IconButton
              size="small"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${f.name}`}
              sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,.55)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          )}
        </Box>
      ))}
    </Box>
  );
}

/** Photo + video picker buttons, validates size. */
export function MediaPickers({ onAdd, onReceipt, onError, disabled, receiptsOnly }) {
  const checked = (cb) => (files) => {
    const bad = files.map(validateFile).filter(Boolean);
    if (bad.length) onError?.(bad.join(' '));
    const ok = files.filter((f) => !validateFile(f));
    if (ok.length) cb(ok);
  };
  const receiptCb = receiptsOnly ? onAdd : onReceipt;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {!receiptsOnly && (
        <>
          <FilePickButton accept="image/*" label="Add photos" icon={<AddAPhotoRounded />} onFiles={checked(onAdd)} disabled={disabled} />
          <FilePickButton accept="video/*" label="Add video" icon={<VideocamRounded />} onFiles={checked(onAdd)} disabled={disabled} />
        </>
      )}
      {receiptCb && (
        <FilePickButton accept="image/*,application/pdf" label="Add receipt" icon={<ReceiptLongRounded />} onFiles={checked(receiptCb)} disabled={disabled} />
      )}
    </Stack>
  );
}

/** Gallery of uploaded attachments with a lightbox. */
export function Gallery({ items, onDelete, canDelete, emptyText }) {
  const [urls, setUrls] = useState({});
  const [open, setOpen] = useState(-1);
  const [err, setErr] = useState(null);
  const key = items.map((i) => i.storage_path).join('|');

  useEffect(() => {
    if (!items.length) return;
    signedUrls(items.map((i) => i.storage_path)).then(setUrls).catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!items.length) {
    return emptyText ? <Typography variant="body2" color="text.secondary">{emptyText}</Typography> : null;
  }
  const visual = items.filter((i) => isImage(i.mime) || isVideo(i.mime));
  const current = visual[open];

  return (
    <>
      {err && <Alert severity="warning">{err}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 1 }}>
        {items.map((a) => {
          const url = urls[a.storage_path];
          const vi = visual.indexOf(a);
          return (
            <Box
              key={a.id}
              onClick={() => (vi >= 0 ? setOpen(vi) : url && window.open(url, '_blank'))}
              sx={{
                position: 'relative', aspectRatio: '1', borderRadius: 3, overflow: 'hidden', cursor: 'pointer',
                bgcolor: 'm3.surfaceContainerHigh', '&:hover .del': { opacity: 1 },
              }}
            >
              {isImage(a.mime) && url && (
                <Box component="img" src={url} alt={a.original_name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {isVideo(a.mime) && (
                <>
                  {url && <Box component="video" src={`${url}#t=0.5`} muted playsInline preload="metadata" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <PlayCircleFilledRounded sx={{ position: 'absolute', inset: 0, m: 'auto', fontSize: 40, color: 'white', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.5))' }} />
                </>
              )}
              {!isImage(a.mime) && !isVideo(a.mime) && (
                <Stack alignItems="center" justifyContent="center" spacing={0.5} sx={{ height: '100%', p: 1, textAlign: 'center' }}>
                  {a.mime === 'application/pdf' ? <PictureAsPdfRounded color="error" /> : <InsertDriveFileRounded color="action" />}
                  <Typography variant="caption" sx={{ wordBreak: 'break-all', lineHeight: 1.2 }}>{a.original_name}</Typography>
                </Stack>
              )}
              {a.category === 'receipt' && (
                <Box sx={{ position: 'absolute', left: 6, top: 6, bgcolor: 'rgba(255,255,255,.92)', borderRadius: 1.5, px: 0.75, py: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ReceiptLongRounded sx={{ fontSize: 14 }} />
                  <Typography variant="caption" fontWeight={500}>Receipt</Typography>
                </Box>
              )}
              {canDelete?.(a) && (
                <Tooltip title="Delete">
                  <IconButton
                    className="del"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onDelete(a); }}
                    sx={{ position: 'absolute', top: 4, right: 4, opacity: { xs: 1, md: 0 }, transition: 'opacity .15s', bgcolor: 'rgba(0,0,0,.55)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,.75)' } }}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>

      <Dialog open={open >= 0} onClose={() => setOpen(-1)} fullScreen PaperProps={{ sx: { bgcolor: '#0b0d0b' } }}>
        {current && (
          <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" alignItems="center" sx={{ p: 1, color: 'white' }}>
              <IconButton onClick={() => setOpen(-1)} sx={{ color: 'white' }} aria-label="Close"><CloseRounded /></IconButton>
              <Box sx={{ flex: 1, minWidth: 0, ml: 1 }}>
                <Typography noWrap>{current.original_name}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {current.who?.full_name} · {fmtDateTime(current.created_at)}
                </Typography>
              </Box>
              <IconButton component="a" href={urls[current.storage_path]} target="_blank" sx={{ color: 'white' }} aria-label="Open original">
                <OpenInNewRounded />
              </IconButton>
            </Stack>
            <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', minHeight: 0, p: 1 }}>
              {isImage(current.mime) ? (
                <Box component="img" src={urls[current.storage_path]} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <Box component="video" key={current.id} src={urls[current.storage_path]} controls autoPlay playsInline sx={{ maxWidth: '100%', maxHeight: '100%' }} />
              )}
            </Box>
            {visual.length > 1 && (
              <>
                <IconButton onClick={() => setOpen((open - 1 + visual.length) % visual.length)} sx={navBtn('left')} aria-label="Previous"><ChevronLeftRounded /></IconButton>
                <IconButton onClick={() => setOpen((open + 1) % visual.length)} sx={navBtn('right')} aria-label="Next"><ChevronRightRounded /></IconButton>
              </>
            )}
          </Box>
        )}
      </Dialog>
    </>
  );
}

const navBtn = (side) => ({
  position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)',
  bgcolor: 'rgba(255,255,255,.15)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,.3)' },
});
