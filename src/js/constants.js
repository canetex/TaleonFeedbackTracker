// src/js/constants.js
export const CATEGORIES = [
  'Melhorias de Qualidade de vida',
  'Novas funcionalidades customizadas',
  'Novas Funcionalidades do Global',
  'Correções',
  'Pendencias de implementação',
  'Ações de Marketing',
];

export const WORLDS = ['SAN', 'AURA'];

export const WORLD_COLORS = {
  SAN: '#007bff',
  AURA: '#6f42c1',
};

/** Paleta Tailwind do site (index.html → taleon.*) */
export const SITE_PALETTE = {
  bg: '#0a0e14',
  card: '#161b22',
  border: '#30363d',
  gold: '#c1a056',
  text: '#e6edf3',
  muted: '#7d8590',
  san: '#007bff',
  aura: '#6f42c1',
};

/** Cores dos gráficos por categoria */
export const CATEGORY_CHART_COLORS = [
  SITE_PALETTE.gold,
  SITE_PALETTE.san,
  SITE_PALETTE.aura,
  SITE_PALETTE.muted,
  '#8a7340',
  '#c45c8a',
];

export const IMGUR_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const IMGUR_MAX_IMAGES = 3;
export const IMGUR_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const STORAGE_VOTES_KEY = 'taleon_voted_suggestions';

export const IP_CACHE_KEY = 'taleon_client_ip';
