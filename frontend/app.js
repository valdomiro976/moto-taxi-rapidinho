'use strict';

const API_BASE = window.MOTO_TAXI_API || 'http://localhost:3000/api';

const state = {
  token: localStorage.getItem('motoTaxiToken') || null,
  user: JSON.parse(localStorage.getItem('motoTaxiUser') || 'null'),
};

const $ = (sel) => document.querySelector(sel);

function setStatus(message, kind = '') {
  const el = $('#auth-status');
  el.textContent = message;
  el.className = `status ${kind}`;
}

async function api(path, { method = 'GET', body } = {}) {
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

function persistSession(user, token) {
  state.user = user;
  state.token = token;
  localStorage.setItem('motoTaxiUser', JSON.stringify(user));
  localStorage.setItem('motoTaxiToken', token);
}

function clearSession() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('motoTaxiUser');
  localStorage.removeItem('motoTaxiToken');
}

function renderSession() {
  const loggedIn = Boolean(state.token && state.user);
  $('#auth').classList.toggle('hidden', loggedIn);
  $('#app-area').classList.toggle('hidden', !loggedIn);
  if (loggedIn) {
    $('#user-name').textContent = state.user.name;
    loadRides();
  }
}

async function handleAuth(action) {
  const form = $('#auth-form');
  const payload = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    role: form.role.value,
  };

  try {
    const data = await api(`/auth/${action}`, { method: 'POST', body: payload });
    persistSession(data.user, data.token);
    setStatus('');
    renderSession();
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

async function loadRides() {
  try {
    const { rides } = await api('/rides');
    renderRides(rides);
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

function renderRides(rides) {
  const list = $('#ride-list');
  list.innerHTML = '';
  if (!rides.length) {
    list.innerHTML = '<li>Nenhuma corrida por aqui ainda.</li>';
    return;
  }
  for (const ride of rides) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="badge">${ride.status}</span>
      <strong>#${ride.id}</strong>
      ${ride.origin} → ${ride.destination}<br />
      R$ ${(ride.priceCents / 100).toFixed(2)}
    `;
    list.appendChild(li);
  }
}

async function createRide(event) {
  event.preventDefault();
  const form = event.target;
  const price = Number(form.price.value || 0);

  try {
    await api('/rides', {
      method: 'POST',
      body: {
        origin: form.origin.value.trim(),
        destination: form.destination.value.trim(),
        priceCents: Math.round(price * 100),
      },
    });
    form.origin.value = '';
    form.destination.value = '';
    setStatus('Corrida solicitada!', 'ok');
    loadRides();
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

$('#auth-form').addEventListener('submit', (e) => {
  e.preventDefault();
  handleAuth('login');
});
$('#auth-form [data-action="register"]').addEventListener('click', () => handleAuth('register'));
$('#ride-form').addEventListener('submit', createRide);
$('#refresh').addEventListener('click', loadRides);
$('#logout').addEventListener('click', () => {
  clearSession();
  renderSession();
});

renderSession();
