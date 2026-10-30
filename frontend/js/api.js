'use strict';

// Cliente da API e sessao compartilhada entre os modulos Passageiro e Motorista.
const MotoTaxi = (() => {
  const API_BASE = window.MOTO_TAXI_API || '/api';

  const state = {
    token: localStorage.getItem('motoTaxiToken') || null,
    user: JSON.parse(localStorage.getItem('motoTaxiUser') || 'null'),
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
    localStorage.setItem('motoTaxiUser', JSON.stringify(user));
    localStorage.setItem('motoTaxiToken', token);
  }

  function logout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('motoTaxiUser');
    localStorage.removeItem('motoTaxiToken');
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
})();
