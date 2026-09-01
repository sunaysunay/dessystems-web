'use client';

import { useState, useEffect, useRef } from 'react';
import { ScreenHeader } from '@/components/ScreenBadge';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type View = 'home' | 'capture' | 'timeline' | 'tally' | 'setup';
type Filter = 'all' | 'high' | 'biz4' | 'followup';

interface Observation {
  id: string;
  eventCode: string;
  dayNo: number;
  capturedAt: string;
  hall: string;
  stand: string;
  companyName: string;
  title: string;
  note: string;
  categories: string[];
  reasons: string[];
  fits: string[];
  nextActions: string[];
  interest: number;
  business: number;
  highValue: boolean;
  followUp: boolean;
  investigate: string;
  priceRetail: string;
  priceBuy: string;
  contactName: string;
  website: string;
  status: string;
  photoCount: number;
  synced?: boolean;
  syncedAt?: string;
}

interface PhotoMeta {
  id: string;
  observationId: string;
  thumbDataUrl: string;
  width: number;
  height: number;
  hash: string;
  driveFileId: string;
  driveLink: string;
  uploaded: boolean;
}

interface DraftPhoto {
  id: string;
  blob: Blob;
  thumbDataUrl: string;
  width: number;
  height: number;
  hash: string;
}

interface TallyEntry {
  signal: string;
  counts: Record<number, number>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const EVENT = {
  code: 'CARAVAN_SALON_2026',
  name: 'CARAVAN SALON 2026',
  city: 'Düsseldorf',
  startDate: '2026-08-28',
  endDate: '2026-09-06',
  driveRoot: 'CARAVAN_SALON_2026',
};

const CATEGORIES = [
  { id: 'vehicle', label: 'Vehicle', emoji: '🚐' },
  { id: 'component', label: 'Component', emoji: '🔧' },
  { id: 'technology', label: 'Technology', emoji: '⚡' },
  { id: 'supplier', label: 'Supplier', emoji: '🏭' },
  { id: 'competitor', label: 'Competitor', emoji: '👁' },
  { id: 'business', label: 'Business', emoji: '💰' },
  { id: 'design', label: 'Design', emoji: '🎨' },
  { id: 'camping', label: 'Camping', emoji: '🏕' },
  { id: 'market', label: 'Market', emoji: '📈' },
  { id: 'contact', label: 'Contact', emoji: '🤝' },
  { id: 'idea', label: 'Idea', emoji: '💡' },
];

const REASONS = [
  'New product', 'New technology', 'Better design', 'Lower-cost solution',
  'Potential supplier', 'Potential resale', 'Import opportunity', 'Partnership',
  'Competitor intelligence', 'Customer demand signal', 'Business model',
  'Manufacturing idea', 'Conversion idea', 'Digital idea', 'Market trend',
  'Never seen before',
];

const FITS = [
  'VW T5', 'VW T6', 'VW T6.1', 'VW T7', 'Sprinter', 'Ducato',
  'Crafter', 'Transit', 'Universal',
];

const NEXT_ACTIONS = [
  'Contact supplier', 'Request price', 'Request MOQ', 'Request catalogue',
  'Request sample', 'Research market', 'Compare competitors', 'Visit again',
];

const DEFAULT_SIGNALS = [
  'Lithium', 'Solar', 'Pop-up roof', 'Modular interior', 'Electric drive',
  'Lightweight', 'Chinese brand', 'Roof tent', 'Compact conversion',
  'Off-grid', 'Smart home', 'Starlink',
];

const CATEGORY_FOLDERS: Record<string, string> = {
  vehicle: '01_VEHICLES', component: '02_COMPONENTS', technology: '03_TECHNOLOGY',
  supplier: '04_SUPPLIERS', business: '05_BUSINESS', competitor: '06_COMPETITORS',
  camping: '07_CAMPING', contact: '08_CONTACTS', design: '99_UNSORTED',
  market: '99_UNSORTED', idea: '99_UNSORTED',
};

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function uid(): string {
  return crypto.randomUUID();
}

function getDayNo(date = new Date()): number {
  const start = new Date(EVENT.startDate + 'T00:00:00');
  return Math.max(1, Math.floor((date.getTime() - start.getTime()) / 86400000) + 1);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

function emptyDraft(): Omit<Observation, 'id' | 'eventCode' | 'dayNo' | 'capturedAt' | 'photoCount'> {
  return {
    hall: '', stand: '', companyName: '', title: '', note: '',
    categories: [], reasons: [], fits: [], nextActions: [],
    interest: 3, business: 3, highValue: false, followUp: false,
    investigate: '', priceRetail: '', priceBuy: '', contactName: '',
    website: '', status: 'captured',
  };
}

// ═══════════════════════════════════════════════════════════════
// INDEXEDDB
// ═══════════════════════════════════════════════════════════════

const DB_NAME = 'bop-field-intel';
const DB_VER = 1;
let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('observations'))
        db.createObjectStore('observations', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos'))
        db.createObjectStore('photos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('blobs'))
        db.createObjectStore('blobs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('tally'))
        db.createObjectStore('tally', { keyPath: 'signal' });
      if (!db.objectStoreNames.contains('settings'))
        db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store: string, value: unknown) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(store: string, key: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getSetting(key: string): Promise<string> {
  const row = await dbGet<{ key: string; value: string }>('settings', key);
  return row?.value ?? '';
}

async function setSetting(key: string, value: string) {
  await dbPut('settings', { key, value });
}

// ═══════════════════════════════════════════════════════════════
// IMAGE PROCESSING
// ═══════════════════════════════════════════════════════════════

async function processImage(file: File): Promise<DraftPhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const maxSize = 1600;
        const thumbSize = 80;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.82));

        const ts = Math.min(1, thumbSize / Math.max(w, h));
        const tw = Math.round(w * ts);
        const th = Math.round(h * ts);
        const tc = document.createElement('canvas');
        tc.width = tw;
        tc.height = th;
        tc.getContext('2d')!.drawImage(img, 0, 0, tw, th);
        const thumbBlob = await new Promise<Blob>(res => tc.toBlob(b => res(b!), 'image/jpeg', 0.6));
        const thumbDataUrl = await blobToDataUrl(thumbBlob);

        const buf = await blob.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        resolve({ id: uid(), blob, thumbDataUrl, width: w, height: h, hash });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ═══════════════════════════════════════════════════════════════
// GOOGLE DRIVE
// ═══════════════════════════════════════════════════════════════

function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

function requestGoogleToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const g = (window as any).google;
    if (!g?.accounts?.oauth2) { reject(new Error('GIS not loaded')); return; }
    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });
}

async function driveFindOrCreate(token: string, name: string, parentId?: string): Promise<string> {
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();
  if (searchData.files?.length > 0) return searchData.files[0].id;

  const meta: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const createData = await createRes.json();
  return createData.id;
}

async function driveUpload(token: string, blob: Blob, name: string, folderId: string, props?: Record<string, string>): Promise<{ id: string; webViewLink: string }> {
  const meta: Record<string, unknown> = { name, parents: [folderId], mimeType: 'image/jpeg' };
  if (props) meta.appProperties = props;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function ScorePicker({ value, onChange, color, label }: {
  value: number; onChange: (v: number) => void; color: string; label: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1.5">{label}</div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-full border-2 transition-colors text-xs font-bold ${
              n <= value
                ? color === 'blue'
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-emerald-500 bg-emerald-500 text-white'
                : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
            }`}
          >{n}</button>
        ))}
      </div>
    </div>
  );
}

function ChipGroup({ items, selected, onChange, multi = true }: {
  items: string[] | { id: string; label: string; emoji?: string }[];
  selected: string[];
  onChange: (sel: string[]) => void;
  multi?: boolean;
}) {
  const list = typeof items[0] === 'string'
    ? (items as string[]).map(s => ({ id: s, label: s }))
    : items as { id: string; label: string; emoji?: string }[];

  function toggle(id: string) {
    if (multi) {
      onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
    } else {
      onChange(selected.includes(id) ? [] : [id]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(item => (
        <button key={item.id} type="button" onClick={() => toggle(item.id)}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            selected.includes(item.id)
              ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {'emoji' in item && item.emoji ? `${item.emoji} ` : ''}{item.label}
        </button>
      ))}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-bounce-in">
      ✓ {message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function Page() {
  const [view, setView] = useState<View>('home');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [photosMeta, setPhotosMeta] = useState<PhotoMeta[]>([]);
  const [tally, setTally] = useState<TallyEntry[]>([]);
  const [hall, setHall] = useState('');
  const [stand, setStand] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToastMsg] = useState('');
  const [dbReady, setDbReady] = useState(false);

  const [draft, setDraft] = useState(emptyDraft());
  const [draftPhotos, setDraftPhotos] = useState<DraftPhoto[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showSessionEdit, setShowSessionEdit] = useState(false);
  const [tempHall, setTempHall] = useState('');
  const [tempStand, setTempStand] = useState('');

  const [driveClientId, setDriveClientId] = useState('');
  const [driveToken, setDriveToken] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [bopSyncStatus, setBopSyncStatus] = useState('');
  const [bopSyncing, setBopSyncing] = useState(false);
  const [newSignal, setNewSignal] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const dayNo = getDayNo();

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000);
  }

  // ── Init ──
  useEffect(() => {
    (async () => {
      try {
        await openDB();
        if (navigator.storage?.persist) navigator.storage.persist();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
        const obs = await dbGetAll<Observation>('observations');
        obs.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
        setObservations(obs);
        const photos = await dbGetAll<PhotoMeta>('photos');
        setPhotosMeta(photos);
        let tallyData = await dbGetAll<TallyEntry>('tally');
        if (tallyData.length === 0) {
          tallyData = DEFAULT_SIGNALS.map(s => ({ signal: s, counts: {} }));
          for (const t of tallyData) await dbPut('tally', t);
        }
        setTally(tallyData);
        const h = await getSetting('hall');
        const s = await getSetting('stand');
        if (h) setHall(h);
        if (s) setStand(s);
        const cid = await getSetting('driveClientId');
        if (cid) setDriveClientId(cid);
        setDbReady(true);
      } catch {
        setDbReady(false);
      }
    })();
  }, []);

  // ── Photo capture ──
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const photo = await processImage(file);
      setDraftPhotos(prev => [...prev, photo]);
      if (view !== 'capture') setView('capture');
    } catch {
      showToast('Failed to process image');
    }
  }

  // ── Save observation ──
  async function saveObservation() {
    const now = new Date().toISOString();
    const autoTitle = draft.title || draft.categories.map(c =>
      CATEGORIES.find(cat => cat.id === c)?.label
    ).filter(Boolean).join(', ') || 'Observation';

    const obs: Observation = {
      id: editId || uid(),
      eventCode: EVENT.code,
      dayNo,
      capturedAt: editId ? (observations.find(o => o.id === editId)?.capturedAt || now) : now,
      hall: draft.hall || hall,
      stand: draft.stand || stand,
      companyName: draft.companyName,
      title: autoTitle,
      note: draft.note,
      categories: draft.categories,
      reasons: draft.reasons,
      fits: draft.fits,
      nextActions: draft.nextActions,
      interest: draft.interest,
      business: draft.business,
      highValue: draft.highValue,
      followUp: draft.followUp,
      investigate: draft.investigate,
      priceRetail: draft.priceRetail,
      priceBuy: draft.priceBuy,
      contactName: draft.contactName,
      website: draft.website,
      status: draft.status,
      photoCount: editId
        ? (observations.find(o => o.id === editId)?.photoCount || 0) + draftPhotos.length
        : draftPhotos.length,
    };

    await dbPut('observations', obs);

    for (const dp of draftPhotos) {
      const pm: PhotoMeta = {
        id: dp.id, observationId: obs.id, thumbDataUrl: dp.thumbDataUrl,
        width: dp.width, height: dp.height, hash: dp.hash,
        driveFileId: '', driveLink: '', uploaded: false,
      };
      await dbPut('photos', pm);
      await dbPut('blobs', { id: dp.id, data: dp.blob });
      setPhotosMeta(prev => [...prev, pm]);
    }

    setObservations(prev => {
      const without = prev.filter(o => o.id !== obs.id);
      return [obs, ...without].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    });

    setDraft(emptyDraft());
    setDraftPhotos([]);
    setEditId(null);
    setShowMore(false);
    setView('home');

    if (navigator.vibrate) navigator.vibrate(50);
    showToast(editId ? 'Updated' : `Saved #${observations.length + 1}`);
  }

  // ── Edit observation ──
  function startEdit(obs: Observation) {
    if (obs.synced) {
      showToast('Synced — read-only');
      return;
    }
    setDraft({
      hall: obs.hall, stand: obs.stand, companyName: obs.companyName,
      title: obs.title, note: obs.note, categories: obs.categories,
      reasons: obs.reasons, fits: obs.fits, nextActions: obs.nextActions,
      interest: obs.interest, business: obs.business, highValue: obs.highValue,
      followUp: obs.followUp, investigate: obs.investigate,
      priceRetail: obs.priceRetail, priceBuy: obs.priceBuy,
      contactName: obs.contactName, website: obs.website, status: obs.status,
    });
    setEditId(obs.id);
    setDraftPhotos([]);
    setShowMore(true);
    setView('capture');
  }

  // ── Delete observation ──
  async function deleteObservation(id: string) {
    const obs = observations.find(o => o.id === id);
    if (obs?.synced) {
      showToast('Synced — use "Clear synced" in Setup');
      return;
    }
    await dbDelete('observations', id);
    const photos = photosMeta.filter(p => p.observationId === id);
    for (const p of photos) {
      await dbDelete('photos', p.id);
      await dbDelete('blobs', p.id);
    }
    setObservations(prev => prev.filter(o => o.id !== id));
    setPhotosMeta(prev => prev.filter(p => p.observationId !== id));
    showToast('Deleted');
  }

  // ── Session context ──
  async function saveSession() {
    setHall(tempHall);
    setStand(tempStand);
    await setSetting('hall', tempHall);
    await setSetting('stand', tempStand);
    setShowSessionEdit(false);
    showToast(`Session: Hall ${tempHall || '—'}`);
  }

  // ── Tally ──
  async function tallyIncrement(signal: string, delta: number) {
    const updated = tally.map(t => {
      if (t.signal !== signal) return t;
      const counts = { ...t.counts };
      counts[dayNo] = Math.max(0, (counts[dayNo] || 0) + delta);
      return { ...t, counts };
    });
    setTally(updated);
    const entry = updated.find(t => t.signal === signal);
    if (entry) await dbPut('tally', entry);
  }

  async function addSignal() {
    const s = newSignal.trim();
    if (!s || tally.some(t => t.signal === s)) return;
    const entry: TallyEntry = { signal: s, counts: {} };
    setTally(prev => [...prev, entry]);
    await dbPut('tally', entry);
    setNewSignal('');
  }

  // ── Drive sync ──
  async function connectDrive() {
    try {
      await loadGIS();
      const token = await requestGoogleToken(driveClientId);
      setDriveToken(token);
      await setSetting('driveClientId', driveClientId);
      showToast('Connected to Google Drive');
    } catch (err: any) {
      showToast('Drive auth failed: ' + (err?.message || 'unknown'));
    }
  }

  async function syncToDrive() {
    if (!driveToken) { showToast('Connect Drive first'); return; }
    setSyncStatus('Syncing...');
    try {
      const rootId = await driveFindOrCreate(driveToken, EVENT.driveRoot);
      const adminId = await driveFindOrCreate(driveToken, '00_ADMIN', rootId);

      const allObs = await dbGetAll<Observation>('observations');
      const allPhotos = await dbGetAll<PhotoMeta>('photos');
      const jsonBlob = new Blob([JSON.stringify({ observations: allObs, photos: allPhotos, tally, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });

      const existing = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='observations.json' and '${adminId}' in parents and trashed=false`)}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${driveToken}` },
      }).then(r => r.json());

      if (existing.files?.length > 0) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.files[0].id}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${driveToken}`, 'Content-Type': 'application/json' },
          body: jsonBlob,
        });
      } else {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify({ name: 'observations.json', parents: [adminId] })], { type: 'application/json' }));
        form.append('file', jsonBlob);
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST', headers: { Authorization: `Bearer ${driveToken}` }, body: form,
        });
      }

      const unuploaded = allPhotos.filter(p => !p.uploaded);
      let uploaded = 0;
      for (const pm of unuploaded) {
        const blobRec = await dbGet<{ id: string; data: Blob }>('blobs', pm.id);
        if (!blobRec) continue;
        const obs = allObs.find(o => o.id === pm.observationId);
        if (!obs) continue;

        const dayFolder = `DAY_${String(obs.dayNo).padStart(2, '0')}`;
        const catFolder = CATEGORY_FOLDERS[obs.categories[0]] || '99_UNSORTED';
        const dayId = await driveFindOrCreate(driveToken, dayFolder, rootId);
        const catId = await driveFindOrCreate(driveToken, catFolder, dayId);

        const safeName = (obs.companyName || 'unknown').replace(/[^a-zA-Z0-9-_ ]/g, '').substring(0, 30);
        const fileName = `${formatTime(obs.capturedAt).replace(':', '')}_H${obs.hall || 'X'}_${safeName}_${pm.id.substring(0, 6)}.jpg`;

        const result = await driveUpload(driveToken, blobRec.data, fileName, catId, {
          obsId: obs.id, dayNo: String(obs.dayNo),
          interest: String(obs.interest), business: String(obs.business),
          highValue: String(obs.highValue),
        });

        pm.driveFileId = result.id;
        pm.driveLink = result.webViewLink;
        pm.uploaded = true;
        await dbPut('photos', pm);
        uploaded++;
        setSyncStatus(`Uploading... ${uploaded}/${unuploaded.length}`);
      }

      setPhotosMeta(await dbGetAll<PhotoMeta>('photos'));
      setSyncStatus(`Done — ${uploaded} photos uploaded`);
      showToast(`Synced: ${uploaded} photos`);
    } catch (err: any) {
      setSyncStatus(`Error: ${err?.message || 'unknown'}`);
    }
  }

  // ── Export ──
  async function exportJSON() {
    const data = {
      event: EVENT,
      observations,
      photos: photosMeta,
      tally,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      showToast('JSON copied to clipboard');
    } catch {
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `field-intel-${EVENT.code}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('JSON downloaded');
    }
  }

  // ── Sync to BOP ──
  async function syncToBOP() {
    const unsynced = observations.filter(o => !o.synced);
    if (unsynced.length === 0) {
      setBopSyncStatus('Nothing to sync — all observations already synced');
      return;
    }
    setBopSyncing(true);
    setBopSyncStatus(`Syncing ${unsynced.length} observations...`);
    try {
      const thumbnailsMap: Record<string, string[]> = {};
      for (const obs of unsynced) {
        const thumbs = photosMeta.filter(p => p.observationId === obs.id).map(p => p.thumbDataUrl);
        if (thumbs.length > 0) thumbnailsMap[obs.id] = thumbs;
      }
      const res = await fetch('/api/bop/ops/fair-scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          observations: unsynced,
          thumbnails_map: thumbnailsMap,
          synced_by: 'phone',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Sync failed');

      const syncedAt = result.synced_at || new Date().toISOString();
      const syncedIds = new Set(result.ids || unsynced.map((o: Observation) => o.id));
      const updated = observations.map(o =>
        syncedIds.has(o.id) ? { ...o, synced: true, syncedAt } : o
      );
      setObservations(updated);
      for (const o of updated) {
        if (syncedIds.has(o.id)) await dbPut('observations', o);
      }
      setBopSyncStatus(`Synced ${result.synced} observations to BOP`);
      showToast(`Synced ${result.synced} to BOP`);
      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    } catch (err: any) {
      setBopSyncStatus(`Sync error: ${err?.message || 'unknown'}`);
    } finally {
      setBopSyncing(false);
    }
  }

  async function deleteSyncedData() {
    const synced = observations.filter(o => o.synced);
    if (synced.length === 0) return;
    for (const obs of synced) {
      await dbDelete('observations', obs.id);
      const photos = photosMeta.filter(p => p.observationId === obs.id);
      for (const p of photos) {
        await dbDelete('photos', p.id);
        await dbDelete('blobs', p.id);
      }
    }
    setObservations(prev => prev.filter(o => !o.synced));
    setPhotosMeta(prev => prev.filter(p => !synced.some(s => s.id === p.observationId)));
    showToast(`Cleared ${synced.length} synced observations`);
  }

  // ── Filtered observations ──
  const filtered = observations.filter(o => {
    if (filter === 'high') return o.highValue;
    if (filter === 'biz4') return o.business >= 4;
    if (filter === 'followup') return o.followUp;
    return true;
  });

  const todayObs = observations.filter(o => o.dayNo === dayNo);
  const pendingPhotos = photosMeta.filter(p => !p.uploaded).length;

  // ── Stats ──
  const stats = {
    total: observations.length,
    today: todayObs.length,
    photos: photosMeta.length,
    highValue: observations.filter(o => o.highValue).length,
    followUps: observations.filter(o => o.followUp).length,
    pending: pendingPhotos,
    synced: observations.filter(o => o.synced).length,
    unsynced: observations.filter(o => !o.synced).length,
  };

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-700 mb-2">Loading Fair Scout...</div>
          <div className="text-sm text-slate-500">Initializing local database</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-slate-50 pb-16 md:pb-0">
      <Toast message={toast} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handlePhoto} />

      {/* ── Desktop header ── */}
      <div className="hidden md:block mb-4">
        <ScreenHeader />
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Fair Scout</h1>
        <p className="text-sm text-slate-500">{EVENT.name} · {EVENT.city} · Day {dayNo}</p>
      </div>

      {/* ── Desktop tabs ── */}
      <div className="hidden md:flex gap-1 mb-4 bg-slate-100 rounded-xl p-1">
        {(['home', 'capture', 'timeline', 'tally', 'setup'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >{v === 'home' ? 'Dashboard' : v}</button>
        ))}
      </div>

      {/* ════════════════════════════════════════ HOME ════════════════════════════════════════ */}
      {view === 'home' && (
        <div className="px-4 md:px-0">
          {/* Mobile header */}
          <div className="md:hidden mb-3">
            <div className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase">BOP Fair Scout</div>
            <div className="text-lg font-bold text-slate-900">{EVENT.name}</div>
            <div className="text-xs text-slate-500">Day {dayNo} — {formatDate(new Date().toISOString())} — {EVENT.city}</div>
          </div>

          {/* Session bar */}
          {!showSessionEdit ? (
            <button onClick={() => { setTempHall(hall); setTempStand(stand); setShowSessionEdit(true); }}
              className="w-full bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700">
                📍 {hall ? `Hall ${hall}` : 'No hall set'}{stand ? ` · ${stand}` : ''}
              </span>
              <span className="text-xs text-blue-500">change</span>
            </button>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 space-y-2">
              <div className="flex gap-2">
                <input placeholder="Hall" value={tempHall} onChange={e => setTempHall(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
                <input placeholder="Stand" value={tempStand} onChange={e => setTempStand(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveSession} className="flex-1 bg-blue-600 text-white text-sm py-2 rounded-lg font-medium">Set</button>
                <button onClick={() => setShowSessionEdit(false)} className="px-4 text-sm text-slate-500">Cancel</button>
              </div>
            </div>
          )}

          {/* Capture button */}
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-10 md:py-8 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl text-center transition-transform mb-4 shadow-lg shadow-blue-600/20">
            <div className="text-3xl mb-1">📷</div>
            <div className="text-lg font-semibold">Capture</div>
            <div className="text-sm opacity-80">Photo + quick observation</div>
          </button>

          {/* Quick categories */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CATEGORIES.slice(0, 6).map(cat => (
              <button key={cat.id} onClick={() => {
                setDraft({ ...emptyDraft(), categories: [cat.id], hall, stand });
                setDraftPhotos([]);
                setEditId(null);
                setShowMore(false);
                setView('capture');
              }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <div className="text-2xl font-bold text-slate-900">{stats.today}</div>
              <div className="text-xs text-slate-500">Today</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <div className="text-2xl font-bold text-slate-900">{stats.photos}</div>
              <div className="text-xs text-slate-500">Photos</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <div className="text-2xl font-bold text-amber-600">{stats.highValue}</div>
              <div className="text-xs text-slate-500">High value</div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-slate-100">
              <div className="text-2xl font-bold text-slate-900">{stats.followUps}</div>
              <div className="text-xs text-slate-500">Follow-ups</div>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl p-3 border border-slate-100 mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total observations</span>
            <span className="text-lg font-bold text-slate-900">{stats.total}</span>
          </div>

          {/* Sync status */}
          <div className="text-center text-xs text-slate-400">
            {pendingPhotos > 0
              ? <span className="text-amber-600">⏳ {pendingPhotos} photos pending upload</span>
              : driveToken
                ? <span className="text-emerald-600">✓ Drive connected</span>
                : <span>Drive not connected</span>
            }
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ CAPTURE ════════════════════════════════════════ */}
      {view === 'capture' && (
        <div className="px-4 md:px-0 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { setView('home'); setDraft(emptyDraft()); setDraftPhotos([]); setEditId(null); }}
              className="text-sm text-slate-500 hover:text-slate-700">← Back</button>
            <span className="text-xs text-slate-400">{editId ? 'Editing' : 'New capture'}</span>
          </div>

          {/* Photos */}
          <div className="bg-slate-100 rounded-xl p-3 mb-4 min-h-[80px]">
            <div className="flex gap-2 flex-wrap items-center">
              {draftPhotos.map(dp => (
                <div key={dp.id} className="relative">
                  <img src={dp.thumbDataUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button onClick={() => setDraftPhotos(prev => prev.filter(p => p.id !== dp.id))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              ))}
              {editId && observations.find(o => o.id === editId) && (
                photosMeta.filter(p => p.observationId === editId).map(pm => (
                  <img key={pm.id} src={pm.thumbDataUrl} alt="" className="w-16 h-16 rounded-lg object-cover opacity-60" />
                ))
              )}
              <button onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors">
                <span className="text-lg">+</span>
                <span className="text-[10px]">Photo</span>
              </button>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-4">
            <div className="text-xs font-medium text-slate-500 mb-1.5">What did you discover?</div>
            <ChipGroup items={CATEGORIES} selected={draft.categories}
              onChange={categories => setDraft(d => ({ ...d, categories }))} />
          </div>

          {/* Scores */}
          <div className="flex gap-6 mb-4">
            <ScorePicker label="Interest — how interesting?" value={draft.interest} color="blue"
              onChange={interest => setDraft(d => ({ ...d, interest }))} />
            <ScorePicker label="Business — could this make money?" value={draft.business} color="emerald"
              onChange={business => setDraft(d => ({ ...d, business }))} />
          </div>

          {/* High Value */}
          <button type="button" onClick={() => setDraft(d => ({
            ...d, highValue: !d.highValue,
            ...(d.highValue ? {} : { interest: 5, business: 5, followUp: true }),
          }))}
            className={`w-full py-3 rounded-xl text-center font-semibold text-sm transition-colors mb-4 ${
              draft.highValue
                ? 'bg-amber-500 text-white border border-amber-500'
                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300'
            }`}>
            🔥 {draft.highValue ? 'HIGH VALUE — marked' : 'Mark as HIGH VALUE'}
          </button>

          {/* Company */}
          <input placeholder="Company name (optional)"
            value={draft.companyName} onChange={e => setDraft(d => ({ ...d, companyName: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white mb-3 focus:outline-none focus:border-blue-400" />

          {/* Hall / Stand (if different from session) */}
          <div className="flex gap-2 mb-3">
            <input placeholder={`Hall${hall ? ` (${hall})` : ''}`}
              value={draft.hall} onChange={e => setDraft(d => ({ ...d, hall: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400" />
            <input placeholder={`Stand${stand ? ` (${stand})` : ''}`}
              value={draft.stand} onChange={e => setDraft(d => ({ ...d, stand: e.target.value }))}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400" />
          </div>

          {/* More details toggle */}
          <button onClick={() => setShowMore(!showMore)}
            className="w-full text-center text-sm text-blue-600 py-2 mb-3 hover:text-blue-700">
            {showMore ? '▲ Less details' : '▼ More details (optional)'}
          </button>

          {showMore && (
            <div className="space-y-3 mb-4 bg-white rounded-xl border border-slate-100 p-4">
              <input placeholder="Title / name" value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400" />

              <textarea placeholder="Quick note..." value={draft.note} rows={2}
                onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:border-blue-400" />

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Why interesting?</div>
                <ChipGroup items={REASONS} selected={draft.reasons}
                  onChange={reasons => setDraft(d => ({ ...d, reasons }))} />
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Vehicle fits</div>
                <ChipGroup items={FITS} selected={draft.fits}
                  onChange={fits => setDraft(d => ({ ...d, fits }))} />
              </div>

              <div className="flex gap-2">
                <input placeholder="Retail price €" value={draft.priceRetail}
                  onChange={e => setDraft(d => ({ ...d, priceRetail: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400" />
                <input placeholder="Buy price €" value={draft.priceBuy}
                  onChange={e => setDraft(d => ({ ...d, priceBuy: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Next actions</div>
                <ChipGroup items={NEXT_ACTIONS} selected={draft.nextActions}
                  onChange={nextActions => setDraft(d => ({ ...d, nextActions }))} />
              </div>

              <div className="flex gap-2">
                <input placeholder="Contact name" value={draft.contactName}
                  onChange={e => setDraft(d => ({ ...d, contactName: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400" />
                <input placeholder="Website" value={draft.website}
                  onChange={e => setDraft(d => ({ ...d, website: e.target.value }))}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-400" />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={draft.followUp}
                    onChange={e => setDraft(d => ({ ...d, followUp: e.target.checked }))}
                    className="rounded border-slate-300" />
                  Follow-up required
                </label>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 mb-1">Would I investigate this at home?</div>
                <div className="flex gap-2">
                  {['No', 'Maybe', 'Absolutely'].map(opt => (
                    <button key={opt} type="button" onClick={() => setDraft(d => ({ ...d, investigate: opt }))}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                        draft.investigate === opt
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save */}
          <button onClick={saveObservation}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-transform shadow-lg shadow-blue-600/20">
            {editId ? 'Update observation' : 'Save & continue'}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════ TIMELINE ════════════════════════════════════════ */}
      {view === 'timeline' && (
        <div className="px-4 md:px-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 md:hidden">Timeline</h2>
            <span className="text-xs text-slate-400">{filtered.length} observations</span>
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {([['all', 'All'], ['high', '🔥 High value'], ['biz4', '💰 Biz 4+'], ['followup', '🤝 Follow-up']] as [Filter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border transition-colors ${
                  filter === f ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-500'
                }`}>{label}</button>
            ))}
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {filtered.map(obs => {
              const thumb = photosMeta.find(p => p.observationId === obs.id);
              return (
                <button key={obs.id} onClick={() => startEdit(obs)}
                  className={`w-full text-left bg-white rounded-xl p-3 flex gap-3 border transition-colors hover:border-blue-200 ${
                    obs.highValue ? 'border-l-4 border-l-amber-500 border-t border-r border-b border-slate-100' : 'border-slate-100'
                  }`}>
                  {thumb ? (
                    <img src={thumb.thumbDataUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-lg">
                      {CATEGORIES.find(c => c.id === obs.categories[0])?.emoji || '📋'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{obs.title}</div>
                    {obs.companyName && (
                      <div className="text-xs text-slate-500 truncate">{obs.companyName}{obs.hall ? ` · H${obs.hall}` : ''}{obs.stand ? ` ${obs.stand}` : ''}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{formatTime(obs.capturedAt)}</span>
                      <span className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= obs.interest ? 'bg-blue-500' : 'bg-slate-200'}`} />
                        ))}
                      </span>
                      <span className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= obs.business ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                        ))}
                      </span>
                      {obs.highValue && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">HV</span>}
                      {obs.followUp && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">FU</span>}
                      {obs.synced && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">synced</span>}
                    </div>
                  </div>
                  {obs.synced ? (
                    <span className="self-start text-emerald-400 text-xs p-1">🔒</span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); if (confirm('Delete this observation?')) deleteObservation(obs.id); }}
                      className="self-start text-slate-300 hover:text-red-500 text-xs p-1">✕</button>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                {filter !== 'all' ? 'No observations match this filter' : 'No observations yet — start capturing!'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ TALLY ════════════════════════════════════════ */}
      {view === 'tally' && (
        <div className="px-4 md:px-0 max-w-lg mx-auto">
          <h2 className="text-lg font-bold text-slate-900 mb-1 md:hidden">Trend tally</h2>
          <p className="text-xs text-slate-500 mb-4">Count signals as you walk — frequency across 800 stands is data no brochure contains.</p>

          <div className="flex gap-2 mb-4">
            <input placeholder="Add new signal..." value={newSignal}
              onChange={e => setNewSignal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSignal()}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-blue-400" />
            <button onClick={addSignal} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium">+</button>
          </div>

          <div className="space-y-1.5">
            {tally.map(t => {
              const todayCount = t.counts[dayNo] || 0;
              const totalCount = Object.values(t.counts).reduce((s, c) => s + c, 0);
              return (
                <div key={t.signal} className="bg-white rounded-xl border border-slate-100 px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{t.signal}</div>
                    <div className="text-[10px] text-slate-400">Total: {totalCount}</div>
                  </div>
                  <button onClick={() => tallyIncrement(t.signal, -1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300 text-lg font-bold">−</button>
                  <div className="w-8 text-center text-lg font-bold text-slate-900">{todayCount}</div>
                  <button onClick={() => tallyIncrement(t.signal, 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 text-lg font-bold">+</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ SETUP ════════════════════════════════════════ */}
      {view === 'setup' && (
        <div className="px-4 md:px-0 max-w-lg mx-auto space-y-4">
          <h2 className="text-lg font-bold text-slate-900 md:hidden">Setup</h2>

          {/* Event */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Event</div>
            <div className="text-sm font-medium text-slate-900">{EVENT.name}</div>
            <div className="text-xs text-slate-500">{EVENT.city} · {EVENT.startDate} to {EVENT.endDate}</div>
            <div className="text-xs text-slate-500">Day {dayNo} · {EVENT.code}</div>
          </div>

          {/* Google Drive */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Google Drive</div>
            <input placeholder="OAuth Client ID" value={driveClientId}
              onChange={e => setDriveClientId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-2 font-mono text-xs focus:outline-none focus:border-blue-400" />
            <div className="flex gap-2">
              <button onClick={connectDrive}
                disabled={!driveClientId}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                {driveToken ? '✓ Connected — reconnect' : 'Connect Drive'}
              </button>
              {driveToken && (
                <button onClick={syncToDrive} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
                  Sync now
                </button>
              )}
            </div>
            {syncStatus && <div className="text-xs text-slate-500 mt-2">{syncStatus}</div>}
            <div className="text-xs text-slate-400 mt-2">
              Pending upload: {pendingPhotos} photos
            </div>
          </div>

          {/* BOP Sync */}
          <div className="bg-white rounded-xl border border-emerald-100 p-4">
            <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Sync to BOP</div>
            <div className="text-xs text-slate-500 mb-3">
              Send observations to bop.dessystems.io so they appear on desktop. Photos stay on phone — only metadata and thumbnails are synced. Synced items become read-only.
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-slate-50 rounded-lg p-2">
                <div className="text-lg font-bold text-slate-900">{stats.unsynced}</div>
                <div className="text-[10px] text-slate-500">Pending</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2">
                <div className="text-lg font-bold text-emerald-700">{stats.synced}</div>
                <div className="text-[10px] text-emerald-600">Synced</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="text-lg font-bold text-blue-700">{stats.total}</div>
                <div className="text-[10px] text-blue-600">Total</div>
              </div>
            </div>
            <button onClick={syncToBOP}
              disabled={bopSyncing || stats.unsynced === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 mb-2">
              {bopSyncing ? 'Syncing...' : stats.unsynced === 0 ? 'All synced' : `Sync ${stats.unsynced} to BOP`}
            </button>
            {stats.synced > 0 && (
              <button onClick={() => {
                if (!confirm(`Clear ${stats.synced} synced observations from phone? They are safely stored in BOP.`)) return;
                deleteSyncedData();
              }}
                className="w-full py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Clear {stats.synced} synced from phone
              </button>
            )}
            {bopSyncStatus && <div className="text-xs text-slate-500 mt-2">{bopSyncStatus}</div>}
          </div>

          {/* Export */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Export</div>
            <button onClick={exportJSON}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              📋 Export JSON (clipboard / download)
            </button>
          </div>

          {/* Storage */}
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Storage</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-500">Observations</div><div className="font-medium text-slate-900">{stats.total}</div>
              <div className="text-slate-500">Photos</div><div className="font-medium text-slate-900">{stats.photos}</div>
              <div className="text-slate-500">High value</div><div className="font-medium text-amber-600">{stats.highValue}</div>
              <div className="text-slate-500">Follow-ups</div><div className="font-medium text-slate-900">{stats.followUps}</div>
              <div className="text-slate-500">Synced</div><div className="font-medium text-emerald-600">{stats.synced}</div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-100 p-4">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Danger zone</div>
            <button onClick={async () => {
              if (!confirm('Delete ALL data? This cannot be undone.')) return;
              if (!confirm('Are you absolutely sure? All observations, photos, and tally data will be lost.')) return;
              const db = await openDB();
              const stores = ['observations', 'photos', 'blobs', 'tally', 'settings'];
              for (const s of stores) {
                const tx = db.transaction(s, 'readwrite');
                tx.objectStore(s).clear();
              }
              setObservations([]);
              setPhotosMeta([]);
              setTally(DEFAULT_SIGNALS.map(s => ({ signal: s, counts: {} })));
              setHall('');
              setStand('');
              showToast('All data cleared');
            }}
              className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              🗑 Clear all data
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════ BOTTOM NAV (mobile) ════════════════════════════════════════ */}
      <nav className="fixed bottom-0 inset-x-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around z-50 md:hidden safe-bottom">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-0.5 ${view === 'home' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center -mt-4">
          <span className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg shadow-blue-600/30">📷</span>
        </button>
        <button onClick={() => setView('timeline')} className={`flex flex-col items-center gap-0.5 ${view === 'timeline' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-medium">Log</span>
        </button>
        <button onClick={() => setView('tally')} className={`flex flex-col items-center gap-0.5 ${view === 'tally' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">📊</span>
          <span className="text-[10px] font-medium">Tally</span>
        </button>
        <button onClick={() => setView('setup')} className={`flex flex-col items-center gap-0.5 ${view === 'setup' ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-medium">Setup</span>
        </button>
      </nav>

      {/* Toast animation */}
      <style>{`
        @keyframes bounce-in { 0% { transform: translateX(-50%) translateY(-10px); opacity: 0; } 100% { transform: translateX(-50%) translateY(0); opacity: 1; } }
        .animate-bounce-in { animation: bounce-in 0.3s ease-out; }
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
      `}</style>
    </div>
  );
}
