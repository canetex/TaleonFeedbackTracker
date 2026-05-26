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

/** Degradê dourado alinhado ao leaderboard (Feature 4) */
export const CHART_GOLD_GRADIENT = ['#f0d48a', '#c1a056', '#9a7d3e', '#8a7340', '#7d8590', '#484e55'];

/** Cores dos gráficos por categoria — mesma paleta do leaderboard */
export const CATEGORY_CHART_COLORS = CHART_GOLD_GRADIENT;

export const STORAGE_BUCKET = 'portal-images';
export const IMAGE_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const IMAGE_MAX_PER_ITEM = 3;
export const IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const STORAGE_VOTES_KEY = 'taleon_voted_suggestions';

export const STORAGE_CARD_LAST_VIEWED_KEY = 'taleon_card_last_viewed';

export const IP_CACHE_KEY = 'taleon_client_ip';
