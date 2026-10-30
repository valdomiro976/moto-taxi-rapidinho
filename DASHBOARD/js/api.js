'use strict';

// Cliente da API e sessao do DASHBOARD.
// A base e relativa: o painel e servido pelo mesmo backend, em /dashboard.
const DashboardApi = (() => {
  const API_BASE = window.MOTO_TAXI_API || '/api';
  const TOKEN_KEY = 'motoTaxiAdminToken';
  const USER_KEY = 'motoTaxiAdminUser';

  const state = {
    token: localStorage.getItem(TOKEN_KEY) || null,
    user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  };

  async function request(path, { method = 'GET', body } = {}) {
    const res = await fetch(API_BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
    return data;
  }

  function save(user, token) {
    state.user = user;
    state.token = token;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clear() {
    state.user = null;
    state.token = null;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function isAdmin() {
    return Boolean(state.token && state.user && state.user.role === 'admin');
  }

  return {
    state,
    request,
    save,
    clear,
    isAdmin,
    signIn: (email, password) =>
      request('/auth/login', { method: 'POST', body: { email, password } }),
    stats: () => request('/admin/stats'),
    users: (role) => request(`/admin/users${role ? `?role=${role}` : ''}`),
    rides: (status) => request(`/admin/rides${status ? `?status=${status}` : ''}`),
  };
})();
