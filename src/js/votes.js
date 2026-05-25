// src/js/votes.js
import { getSupabase } from './supabase-client.js';
import { getClientIp } from './ip.js';
import { STORAGE_VOTES_KEY } from './constants.js';

const RPC_ERROR_MESSAGES = {
  vote_quota_exceeded_up:
    'Você atingiu o limite de 8 votos positivos para este IP.',
  vote_quota_exceeded_down:
    'Você atingiu o limite de 8 votos negativos para este IP.',
  vote_per_suggestion_exceeded:
    'Você já usou os 8 votos deste tipo nesta sugestão.',
  suggestion_not_approved: 'Só é possível votar em sugestões aprovadas.',
  invalid_vote_type: 'Tipo de voto inválido.',
  invalid_ip_address: 'Não foi possível identificar o IP para votar.',
};

/** @type {{ limit_up: number, limit_down: number, limit_per_suggestion: number, used_up: number, used_down: number, remaining_up: number, remaining_down: number } | null} */
let current_quota = null;

function readVotedMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_VOTES_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeVotedMap(map) {
  localStorage.setItem(STORAGE_VOTES_KEY, JSON.stringify(map));
}

/** @returns {{ up: number, down: number }} */
export function getSuggestionVoteCounts(suggestionId) {
  const entry = readVotedMap()[suggestionId];
  if (!entry) return { up: 0, down: 0 };
  if (typeof entry === 'string') {
    return entry === 'up' ? { up: 1, down: 0 } : { up: 0, down: 1 };
  }
  return { up: Number(entry.up) || 0, down: Number(entry.down) || 0 };
}

function normalizeQuota(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const n = (key) => Math.max(0, Number(raw[key]) || 0);
  return {
    limit_up: n('limit_up'),
    limit_down: n('limit_down'),
    limit_per_suggestion: n('limit_per_suggestion') || 8,
    used_up: n('used_up'),
    used_down: n('used_down'),
    remaining_up: n('remaining_up'),
    remaining_down: n('remaining_down'),
  };
}

function rpcErrorMessage(error) {
  const code = String(error?.message || error?.details || '').trim();
  if (RPC_ERROR_MESSAGES[code]) return RPC_ERROR_MESSAGES[code];
  return error?.message || 'Erro ao registrar voto.';
}

export function getVoteQuota() {
  return current_quota;
}

export function hasRemainingVoteType(voteType) {
  if (!current_quota) return true;
  if (voteType === 'up') return current_quota.remaining_up > 0;
  if (voteType === 'down') return current_quota.remaining_down > 0;
  return false;
}

export function canVoteOnSuggestion(suggestionId, voteType) {
  if (!hasRemainingVoteType(voteType)) return false;
  const limit = current_quota?.limit_per_suggestion ?? 8;
  const counts = getSuggestionVoteCounts(suggestionId);
  return counts[voteType] < limit;
}

/** @deprecated use canVoteOnSuggestion */
export function hasVotedLocally(suggestionId) {
  const counts = getSuggestionVoteCounts(suggestionId);
  const limit = current_quota?.limit_per_suggestion ?? 8;
  return counts.up >= limit && counts.down >= limit;
}

export function validateVoteBeforeCast(suggestionId, voteType) {
  if (!canVoteOnSuggestion(suggestionId, voteType)) {
    const counts = getSuggestionVoteCounts(suggestionId);
    const limit = current_quota?.limit_per_suggestion ?? 8;
    if (counts[voteType] >= limit) {
      throw new Error(RPC_ERROR_MESSAGES.vote_per_suggestion_exceeded);
    }
    throw new Error(
      voteType === 'up'
        ? RPC_ERROR_MESSAGES.vote_quota_exceeded_up
        : RPC_ERROR_MESSAGES.vote_quota_exceeded_down
    );
  }
}

export async function fetchVoteQuota() {
  const supabase = getSupabase();
  const ip_address = await getClientIp();
  const { data, error } = await supabase.rpc('get_vote_quota', {
    p_ip_address: ip_address,
  });
  if (error) throw error;
  current_quota = normalizeQuota(data);
  return current_quota;
}

export function renderVoteQuotaHeader() {
  const wrap = document.getElementById('vote-quota-wrap');
  const upEl = document.getElementById('vote-quota-up');
  const downEl = document.getElementById('vote-quota-down');
  const upUsedEl = document.getElementById('vote-quota-up-used');
  const downUsedEl = document.getElementById('vote-quota-down-used');
  if (!wrap || !upEl || !downEl) return;

  if (!current_quota) {
    wrap.classList.add('hidden');
    return;
  }

  wrap.classList.remove('hidden');
  upEl.textContent = String(current_quota.remaining_up);
  downEl.textContent = String(current_quota.remaining_down);
  if (upUsedEl) {
    upUsedEl.textContent = `${current_quota.used_up}/${current_quota.limit_up}`;
  }
  if (downUsedEl) {
    downUsedEl.textContent = `${current_quota.used_down}/${current_quota.limit_down}`;
  }
  window.lucide?.createIcons();
}

export async function castVote(suggestionId, voteType) {
  validateVoteBeforeCast(suggestionId, voteType);

  const supabase = getSupabase();
  const ip_address = await getClientIp();

  const { data, error } = await supabase.rpc('cast_public_vote', {
    p_ip_address: ip_address,
    p_suggestion_id: suggestionId,
    p_vote_type: voteType,
  });

  if (error) {
    throw new Error(rpcErrorMessage(error));
  }

  current_quota = normalizeQuota(data) ?? current_quota;

  const map = readVotedMap();
  const prev = getSuggestionVoteCounts(suggestionId);
  map[suggestionId] = {
    up: prev.up + (voteType === 'up' ? 1 : 0),
    down: prev.down + (voteType === 'down' ? 1 : 0),
  };
  writeVotedMap(map);
  renderVoteQuotaHeader();
}
