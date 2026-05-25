// src/js/ip.js
import { IP_CACHE_KEY } from './constants.js';

export async function getClientIp() {
  const cached = sessionStorage.getItem(IP_CACHE_KEY);
  if (cached) return cached;

  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) throw new Error('ipify failed');
    const data = await res.json();
    if (data?.ip) {
      sessionStorage.setItem(IP_CACHE_KEY, data.ip);
      return data.ip;
    }
  } catch {
    /* fallback local */
  }

  const fallback = `local-${crypto.randomUUID().slice(0, 8)}`;
  sessionStorage.setItem(IP_CACHE_KEY, fallback);
  return fallback;
}
