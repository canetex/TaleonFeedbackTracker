// src/js/imgur.js — upload opcional via Edge Function upload-imgur (Fase 7)
import { getSupabaseForFunctions } from './supabase-client.js';
import {
  IMGUR_ALLOWED_TYPES,
  IMGUR_MAX_FILE_BYTES,
  IMGUR_MAX_IMAGES,
} from './constants.js';

let pendingUrls = [];

export function getPendingImageUrls() {
  return [...pendingUrls];
}

export function clearPendingImages() {
  pendingUrls = [];
  const input = document.getElementById('suggestion-images');
  const preview = document.getElementById('image-preview-list');
  if (input) input.value = '';
  if (preview) preview.innerHTML = '';
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(file) {
  if (!IMGUR_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Use JPEG, PNG, GIF ou WebP.');
  }
  if (file.size > IMGUR_MAX_FILE_BYTES) {
    throw new Error('Imagem maior que 10 MB.');
  }
  if (pendingUrls.length >= IMGUR_MAX_IMAGES) {
    throw new Error(`Máximo de ${IMGUR_MAX_IMAGES} imagens por sugestão.`);
  }

  const dataUrl = await readFileAsBase64(file);
  const supabase = getSupabaseForFunctions();
  const { data, error } = await supabase.functions.invoke('upload-imgur', {
    body: {
      image_base64: dataUrl,
      mime_type: file.type,
    },
  });

  if (error) {
    throw new Error(error.message || 'Falha no upload, tente outra imagem');
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  if (!data?.url) {
    throw new Error('Falha no upload, tente outra imagem');
  }

  pendingUrls.push(data.url);
  return data.url;
}

function renderPreviewItem(url, index) {
  return `
    <div class="relative inline-block" data-preview-index="${index}">
      <img src="${url}" alt="Preview ${index + 1}" class="h-16 w-16 rounded border border-taleon-border object-cover" loading="lazy" />
      <button type="button" data-remove-image="${index}" class="absolute -right-1 -top-1 rounded-full border border-taleon-border bg-taleon-card p-0.5 text-taleon-muted hover:text-red-400" aria-label="Remover imagem">
        <i data-lucide="x" class="h-3 w-3"></i>
      </button>
    </div>
  `;
}

function refreshPreview() {
  const preview = document.getElementById('image-preview-list');
  if (!preview) return;
  preview.innerHTML = pendingUrls.map((url, i) => renderPreviewItem(url, i)).join('');
  window.lucide?.createIcons();
}

export function bindImageUpload() {
  const input = document.getElementById('suggestion-images');
  const form = document.getElementById('form-suggestion');
  if (!input) return;

  input.addEventListener('change', async () => {
    const files = [...(input.files ?? [])];
    input.value = '';
    for (const file of files) {
      if (pendingUrls.length >= IMGUR_MAX_IMAGES) {
        window.showToast?.(`Máximo de ${IMGUR_MAX_IMAGES} imagens.`);
        break;
      }
      try {
        await uploadImageFile(file);
        refreshPreview();
      } catch (err) {
        window.showToast?.(err.message || 'Falha no upload, tente outra imagem');
      }
    }
  });

  document.getElementById('image-preview-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-image]');
    if (!btn) return;
    const idx = Number(btn.dataset.removeImage);
    if (!Number.isNaN(idx)) {
      pendingUrls.splice(idx, 1);
      refreshPreview();
    }
  });

  form?.addEventListener('reset', () => clearPendingImages());
}
