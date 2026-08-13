import React from 'react';
import { SCREEN_REGISTRY } from '@/lib/screen-registry';

const ICONS: Record<string, React.ReactNode> = {
  grid:      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  chart:     <path d="M4 20V10M10 20V4M16 20v-8M3 20h18" />,
  cube:      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />,
  tag:       <path d="M3 12l9 9 8-8-9-9H3v8zM7.5 7.5h.01" />,
  users:     <path d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M8 10a3 3 0 100-6 3 3 0 000 6zM20 20v-2a4 4 0 00-3-3.9M16 4.1a4 4 0 010 7.8" />,
  user:      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
  idbadge:   <path d="M4 4h16v16H4zM8 8h4M8 12h8M8 16h8M15 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />,
  shield:    <path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z" />,
  lock:      <path d="M6 11h12v10H6zM8 11V7a4 4 0 018 0v4" />,
  clipboard: <path d="M9 4h6v2H9zM7 4H5v16h14V4h-2M9 12h6M9 16h6" />,
  check:     <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />,
  sliders:   <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4M14 4v4M6 10v4M12 16v4" />,
  building:  <path d="M4 21V4h10v17M14 21V9h6v12M7 8h2M7 12h2M7 16h2M17 12h.01M17 16h.01" />,
  search:    <path d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" />,
  menu:      <path d="M3 6h18M3 12h18M3 18h18" />,
  cog:       <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1A2 2 0 116.9 4l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z" />,
  code:      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />,
  gauge:     <path d="M12 21a9 9 0 110-18 9 9 0 010 18M12 12l4-3" />,
  sparkles:  <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />,
  queue:     <path d="M3 6h13M3 12h13M3 18h13M20 6v12M20 6l-2 2M20 6l2 2" />,
  gitcommit: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM3 12h6M15 12h6" />,
  rocket:    <path d="M5 15c-1 2-1 4-1 4s2 0 4-1M9 15l-4-4c3-6 8-8 13-8 0 5-2 10-8 13l-4-4M14 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
  activity:  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  clock:     <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2" />,
  mail:      <path d="M3 5h18v14H3zM3 6l9 7 9-7" />,
  plug:      <path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 01-10 0V8zM12 16v6" />,
  folder:    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />,
  monitor:   <path d="M3 4h18v12H3zM8 20h8M12 16v4" />,
  share:     <path d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />,
  cash:      <path d="M3 6h18v12H3zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9h.01M18 15h.01" />,
  calculator:<path d="M6 3h12v18H6zM9 7h6M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h4" />,
  receipt:   <path d="M6 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1zM9 8h6M9 12h6" />,
  cart:      <path d="M9 20a1 1 0 100 2 1 1 0 000-2zM18 20a1 1 0 100 2 1 1 0 000-2zM2 3h3l2.4 12.2a1 1 0 001 .8h9.5a1 1 0 001-.8L21 7H6" />,
  megaphone: <path d="M3 11v2a1 1 0 001 1h2l4 4V6L6 10H4a1 1 0 00-1 1zM14 8a4 4 0 010 8M18 5a8 8 0 010 14" />,
  gavel:     <path d="M14 4l6 6-3 3-6-6 3-3zM11 7l-7 7M8 11l3 3M3 21h9" />,
  list:      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  upload:    <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12M7 8l5-5 5 5" />,
  database:  <path d="M12 5c4.4 0 8-1.3 8-3S16.4-1 12-1 4 .3 4 2s3.6 3 8 3zM4 2v16c0 1.7 3.6 3 8 3s8-1.3 8-3V2M4 10c0 1.7 3.6 3 8 3s8-1.3 8-3" />,
  truck:     <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M6 21a2 2 0 100-4 2 2 0 000 4zM18 21a2 2 0 100-4 2 2 0 000 4z" />,
  wrench:    <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.9 2.9-2.5-.5-.5-2.5 2.9-2.8z" />,
  target:    <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01" />,
  flag:      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  beaker:    <path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3M7 15h10" />,
  qrcode:    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM19 14h1M20 17v3M14 20h3" />,
  image:     <path d="M4 5h16v14H4zM8 11a2 2 0 100-4 2 2 0 000 4zM4 17l5-5 4 4 3-3 4 4" />,
  pencil:    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />,
  droplet:   <path d="M12 3s6 6 6 11a6 6 0 01-12 0c0-5 6-11 6-11z" />,
  eye:       <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z" />,
  star:      <path d="M12 3l2.9 6 6.1.9-4.5 4.3 1.1 6.1L12 17.8 6.4 20.4l1.1-6.1L3 10l6.1-.9L12 3z" />,
  sitemap:   <path d="M9 3h6v4H9zM3 17h6v4H3zM15 17h6v4h-6zM12 7v4M6 17v-4h12v4" />,
  wand:      <path d="M15 4V2M15 8V6M11 6h2M17 6h2M20 20L8 8M6 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />,
  dot:       <circle cx="12" cy="12" r="2.5" />,
};

const TC_ICON: Record<string, string> = {
  // SYSTEM
  SY002: 'idbadge', SY027: 'shield', SY011: 'lock', SY012: 'clipboard',
  SY004: 'sliders', SY003: 'building', SY024: 'search', SY018: 'grid', SY019: 'menu',
  SY001: 'users', SY015: 'user', SY026: 'monitor', SY016: 'clipboard',
  SY013: 'gauge', SY014: 'activity', SY020: 'clock', SY021: 'mail', SY022: 'plug', SY023: 'folder', SY025: 'share',
  // DEV
  DV001: 'gauge', DV002: 'sparkles', DV003: 'queue', DV004: 'gitcommit', DV005: 'tag', DV006: 'rocket',
  IT001: 'plug', IT002: 'clipboard', IT003: 'git-branch', IT004: 'layers', IT005: 'sliders', IT006: 'book-open', IT007: 'send', IT008: 'zap',
  DA001: 'search', DA002: 'list', DA003: 'database', DA004: 'clock', DA005: 'trending-up',
  // INTELLIGENCE (analytics / marketing / crm mix)
  AN001: 'gauge', SA012: 'calculator', CR003: 'chart',
  MK001: 'eye', MK002: 'target', MK003: 'users', MK004: 'star', MK005: 'search', MK006: 'megaphone', MK007: 'camera', MK008: 'image',
  // MASTER DATA
  MD001: 'idbadge', MD003: 'sitemap',
  // TOOLS (OPS)
  OP001: 'check', OP002: 'flag', OP003: 'beaker', OP004: 'qrcode',
  OP005: 'image', OP006: 'pencil', OP007: 'droplet', OP008: 'wand',
  // MARKETPLACE / AUCTIONS
  MP001: 'list', MP003: 'list', MP004: 'upload', AU001: 'gavel', AU002: 'gavel', AU004: 'gavel',
  // FINANCE
  FI001: 'cash', FI002: 'cash', FI005: 'receipt', FI007: 'search', FI008: 'sparkles', FI009: 'chart', FI011: 'receipt', FI012: 'receipt',
  // CRM
  CR001: 'users', CR002: 'user', CR004: 'activity', CR006: 'grid',
  // AI
  AI001: 'sparkles', AI002: 'wrench', AI003: 'clipboard', AI004: 'clipboard', AI005: 'cog',
  // ASSETS / INVENTORY
  AS001: 'cube', IN001: 'cube', IN002: 'tag', IN003: 'tag', IN004: 'truck', IN005: 'upload',
};

const ROUTE_ICON: Record<string, string> = { '/console': 'grid' };
const SEG_ICON: Record<string, string> = {
  anl: 'chart', ast: 'cube', inv: 'tag', crm: 'users', fin: 'cash', mdm: 'database',
  mkp: 'cart', sys: 'cog', dev: 'code', int: 'plug', ops: 'wrench', sal: 'receipt',
  pub: 'megaphone', ai: 'sparkles', mkt: 'megaphone',
};

export function navIcon(href: string) {
  const tc = SCREEN_REGISTRY[href]?.id;
  let key = (tc && TC_ICON[tc]) || ROUTE_ICON[href];
  if (!key) { const seg = (href.split('/')[2] ?? '').split('?')[0]; key = SEG_ICON[seg] ?? 'dot'; }
  return (
    <svg className="bop-nav-ico h-[18px] w-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[key] ?? ICONS.dot}
    </svg>
  );
}
