// src/js/votes.js
import { getSupabase } from './supabase-client.js';
import { getClientIp } from './ip.js';
import { STORAGE_VOTES_KEY } from './constants.js';

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

export function hasVotedLocally(suggestionId) {
  return Boolean(readVotedMap()[suggestionId]);
}

export async function castVote(suggestionId, voteType) {
  if (hasVotedLocally(suggestionId)) {
    throw new Error('Você já votou nesta sugestão neste navegador.');
  }

  const supabase = getSupabase();
  const ip_address = await getClientIp();

  const { error } = await supabase.from('votes').insert({
    suggestion_id: suggestionId,
    ip_address,
    vote_type: voteType,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este IP já registrou voto nesta sugestão.');
    }
    throw error;
  }

  const map = readVotedMap();
  map[suggestionId] = voteType;
  writeVotedMap(map);
}
