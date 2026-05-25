// src/js/storage-upload.js — uploads para Supabase Storage (bucket portal-images)
import { getSupabase } from './supabase-client.js';
import {
  IMAGE_ALLOWED_TYPES,
  IMAGE_MAX_FILE_BYTES,
  IMAGE_MAX_PER_ITEM,
  STORAGE_BUCKET,
} from './constants.js';

function safeExtension(file) {
  const fromName = file.name?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 5) return fromName;
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[file.type] || 'png';
}

export async function uploadImageToStorage(file, folder) {
  if (!IMAGE_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Use JPEG, PNG, GIF ou WebP.');
  }
  if (file.size > IMAGE_MAX_FILE_BYTES) {
    throw new Error('Imagem maior que 10 MB.');
  }

  const supabase = getSupabase();
  const path = `${folder}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Falha no upload da imagem.');
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Falha ao obter URL pública da imagem.');
  }
  return data.publicUrl;
}

function createUploadBinder({ folder, inputId, previewId, formId, getPending, setPending, clearPending }) {
  function renderPreviewItem(url, index) {
    return `
    <div class="relative inline-block" data-preview-index="${index}">
      <img src="${url}" alt="Preview" class="h-16 w-16 rounded border border-taleon-border object-cover" loading="lazy" />
      <button type="button" data-remove-image="${index}" class="absolute -right-1 -top-1 rounded-full border border-taleon-border bg-taleon-card p-0.5 text-taleon-muted hover:text-red-400" aria-label="Remover imagem">
        <i data-lucide="x" class="h-3 w-3"></i>
      </button>
    </div>
  `;
  }

  function refreshPreview() {
    const preview = document.getElementById(previewId);
    if (!preview) return;
    const urls = getPending();
    preview.innerHTML = urls.map((url, i) => renderPreviewItem(url, i)).join('');
    preview.classList.toggle('hidden', urls.length === 0);
    window.lucide?.createIcons();
  }

  return function bind() {
    const input = document.getElementById(inputId);
    const form = formId ? document.getElementById(formId) : null;
    if (!input) return;

    input.addEventListener('change', async () => {
      const files = [...(input.files ?? [])];
      input.value = '';
      for (const file of files) {
        if (getPending().length >= IMAGE_MAX_PER_ITEM) {
          window.showToast?.(`Máximo de ${IMAGE_MAX_PER_ITEM} imagens.`);
          break;
        }
        input.disabled = true;
        try {
          window.showToast?.('Enviando imagem…');
          const url = await uploadImageToStorage(file, folder);
          setPending([...getPending(), url]);
          refreshPreview();
        } catch (err) {
          window.showToast?.(err.message || 'Falha no upload, tente outra imagem');
        } finally {
          input.disabled = getPending().length >= IMAGE_MAX_PER_ITEM;
        }
      }
      input.disabled = getPending().length >= IMAGE_MAX_PER_ITEM;
    });

    document.getElementById(previewId)?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-image]');
      if (!btn) return;
      const idx = Number(btn.dataset.removeImage);
      if (!Number.isNaN(idx)) {
        const next = [...getPending()];
        next.splice(idx, 1);
        setPending(next);
        refreshPreview();
      }
    });

    form?.addEventListener('reset', () => {
      clearPending();
      refreshPreview();
      if (input) input.disabled = false;
    });
  };
}

let suggestionPendingUrls = [];
let commentPendingUrls = [];

export function getPendingSuggestionImageUrls() {
  return [...suggestionPendingUrls];
}

export function clearPendingSuggestionImages() {
  suggestionPendingUrls = [];
  const input = document.getElementById('suggestion-images');
  const preview = document.getElementById('image-preview-list');
  if (input) {
    input.value = '';
    input.disabled = false;
  }
  if (preview) {
    preview.innerHTML = '';
    preview.classList.add('hidden');
  }
}

export function getPendingCommentImageUrls() {
  return [...commentPendingUrls];
}

export function clearPendingCommentImages() {
  commentPendingUrls = [];
  const input = document.getElementById('comment-images');
  const preview = document.getElementById('comment-image-preview-list');
  if (input) {
    input.value = '';
    input.disabled = false;
  }
  if (preview) {
    preview.innerHTML = '';
    preview.classList.add('hidden');
  }
}

const bindSuggestionStorage = createUploadBinder({
  folder: 'suggestions',
  inputId: 'suggestion-images',
  previewId: 'image-preview-list',
  formId: 'form-suggestion',
  getPending: () => suggestionPendingUrls,
  setPending: (urls) => {
    suggestionPendingUrls = urls;
  },
  clearPending: clearPendingSuggestionImages,
});

const bindCommentStorage = createUploadBinder({
  folder: 'comments',
  inputId: 'comment-images',
  previewId: 'comment-image-preview-list',
  formId: 'form-comment',
  getPending: () => commentPendingUrls,
  setPending: (urls) => {
    commentPendingUrls = urls;
  },
  clearPending: clearPendingCommentImages,
});

export function bindSuggestionImageUpload() {
  bindSuggestionStorage();
}

export function bindCommentImageUpload() {
  bindCommentStorage();
}
