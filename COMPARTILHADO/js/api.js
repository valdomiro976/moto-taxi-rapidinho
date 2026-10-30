'use strict';

// Fabrica do cliente da API, compartilhada pelos apps Passageiro e Motorista.
// Cada app usa um prefixo proprio de armazenamento: como os dois rodam na mesma
// origem, chaves iguais fariam a sessao de um vazar para o outro.
function createApi(storagePrefix) {
  const API_BASE = window.MOTO_TAXI_API || '/api';
  const TOKEN_KEY = `${storagePrefix}Token`;
  const USER_KEY = `${storagePrefix}User`;

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

  function login(user, token) {
    state.user = user;
    state.token = token;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
  }

  function logout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return Boolean(state.token && state.user);
  }

  return {
    state,
    request,
    login,
    logout,
    isLoggedIn,
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    signIn: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  };
}
