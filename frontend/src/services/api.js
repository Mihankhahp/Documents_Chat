const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE) ||
  '';
async function api(path, { method = 'GET', headers = {}, body, userId } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(userId ? { 'user-id': userId } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {}
  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      res.statusText ||
      'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

async function apiUpload(path, file, { userId } = {}) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { ...(userId ? { 'user-id': userId } : {}) },
    body: form,
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {}
  if (!res.ok) {
    const msg =
      payload?.error?.message ||
      payload?.message ||
      res.statusText ||
      'Upload failed';
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

// Auth
export const signup = ({ username, password }) =>
  api('/v1/auth/signup', { method: 'POST', body: { username, password } });
export const signin = ({ username, password }) =>
  api('/v1/auth/signin', { method: 'POST', body: { username, password } });

// Files
export const listFiles = ({ userId }) => api('/v1/files', { userId });
export const uploadFile = ({ userId, file }) =>
  apiUpload('/v1/files', file, { userId });
export const deleteFile = ({ userId, docId }) =>
  api(`/v1/files/${docId}`, { method: 'DELETE', userId });
export const resetUser = ({ userId }) =>
  api('/v1/reset', { method: 'POST', userId });

// Chat
export async function chat({
  userId,
  query,
  docIds,
  temperature,
  provider,
  model,
  historyLimit = 12,
  conversationId,
  topK = 12,
  maxContext = 6,
  openaiKey,
  maxOutputTokens = 1024,
}) {
  if (!docIds || !docIds.length) throw new Error('Select at least one file.');
  const headers = {};
  if (provider) headers['X-LLM-Provider'] = provider;
  if (model) headers['X-LLM-Model'] = model;
  if (openaiKey) headers['X-OpenAI-Key'] = openaiKey;
  return api('/v1/chat', {
    method: 'POST',
    headers,
    userId,
    body: {
      query,
      doc_ids: docIds,
      temperature,
      history_limit: historyLimit,
      conversation_id: conversationId,
      top_k: topK,
      max_context: maxContext,
      max_output_tokens: maxOutputTokens,
    },
  });
}

// Conversations
export const createConversation = ({ userId, title = null }) =>
  api('/v1/conversations', { method: 'POST', userId, body: { title } });
export const listConversations = ({ userId }) =>
  api('/v1/conversations', { userId });
export const deleteConversation = ({ userId, conversationId }) =>
  api(`/v1/conversations/${conversationId}`, { method: 'DELETE', userId });
export const getConversation = ({ userId, conversationId }) =>
  api(`/v1/conversations/${conversationId}`, { userId });

// Health
export const health = async () => {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
};
