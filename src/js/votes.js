// src/js/votes.js

import { getSupabase } from './supabase-client.js';

import { getClientIp } from './ip.js';

import { STORAGE_VOTES_KEY } from './constants.js';



const RPC_ERROR_MESSAGES = {

  vote_quota_exceeded_up:

    'Você atingiu o limite de votos positivos para este IP.',

  vote_quota_exceeded_down:

    'Você atingiu o limite de votos negativos para este IP.',

  vote_already_cast: 'Este IP já registrou voto nesta sugestão.',

  suggestion_not_approved: 'Só é possível votar em sugestões aprovadas.',

  invalid_vote_type: 'Tipo de voto inválido.',

  invalid_ip_address: 'Não foi possível identificar o IP para votar.',

};



/** @type {{ limit_up: number, limit_down: number, used_up: number, used_down: number, remaining_up: number, remaining_down: number } | null} */

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



function normalizeQuota(raw) {

  if (!raw || typeof raw !== 'object') return null;

  const n = (key) => Math.max(0, Number(raw[key]) || 0);

  return {

    limit_up: n('limit_up'),

    limit_down: n('limit_down'),

    used_up: n('used_up'),

    used_down: n('used_down'),

    remaining_up: n('remaining_up'),

    remaining_down: n('remaining_down'),

  };

}



function rpcErrorMessage(error) {

  const code = String(error?.message || error?.details || '').trim();

  if (RPC_ERROR_MESSAGES[code]) return RPC_ERROR_MESSAGES[code];

  if (error?.code === '23505') return RPC_ERROR_MESSAGES.vote_already_cast;

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



export function hasVotedLocally(suggestionId) {

  return Boolean(readVotedMap()[suggestionId]);

}



export function validateVoteBeforeCast(suggestionId, voteType) {

  if (hasVotedLocally(suggestionId)) {

    throw new Error('Você já votou nesta sugestão neste navegador.');

  }

  if (!hasRemainingVoteType(voteType)) {

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

  if (!wrap || !upEl || !downEl) return;



  if (!current_quota) {

    wrap.classList.add('hidden');

    return;

  }



  wrap.classList.remove('hidden');

  upEl.textContent = String(current_quota.remaining_up);

  downEl.textContent = String(current_quota.remaining_down);

  upEl.title = `${current_quota.used_up} de ${current_quota.limit_up} votos positivos usados`;

  downEl.title = `${current_quota.used_down} de ${current_quota.limit_down} votos negativos usados`;

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

  map[suggestionId] = voteType;

  writeVotedMap(map);

  renderVoteQuotaHeader();

}


