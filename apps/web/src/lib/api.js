const BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Request failed (${response.status})`);
    err.status = response.status;
    err.code = data.error;
    throw err;
  }
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  login:  (body) => request('/auth/login',  { method: 'POST', body }),
  logout: ()     => request('/auth/logout', { method: 'POST' }),
  me:     ()     => request('/auth/me'),
  forgotPassword: (body) => request('/auth/forgot', { method: 'POST', body }),
  resetPassword:  (body) => request('/auth/reset',  { method: 'POST', body }),

  listEvents: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to)   params.set('to', to);
    return request(`/events?${params}`);
  },
  createEvent: (body)  => request('/events',       { method: 'POST', body }),
  deleteEvent: (id)    => request(`/events/${id}`, { method: 'DELETE' }),

  googleStatus:     ()    => request('/google/status'),
  googleConnect:    ()    => request('/google/connect'),
  googleDisconnect: ()    => request('/google/disconnect', { method: 'POST' }),

  chat: (body) => request('/chat', { method: 'POST', body }),

  adminLogs: ({ limit = 200, action } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (action) params.set('action', action);
    return request(`/admin/logs?${params}`);
  },
  adminStats: () => request('/admin/stats'),
};
