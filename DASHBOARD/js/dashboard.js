'use strict';

// Logica do painel: login, navegacao e carregamento dos dados.
const Dashboard = (() => {
  const STATUS_LABELS = {
    requested: 'Aguardando motoboy',
    accepted: 'Aceita',
    in_progress: 'Em andamento',
    completed: 'Concluída',
    canceled: 'Cancelada',
  };
  const ROLE_LABELS = { passenger: 'Passageiro', driver: 'Motorista', admin: 'Admin' };

  const $ = (sel) => document.querySelector(sel);

  function money(cents) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function date(iso) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  }

  function pill(text, kind) {
    return `<span class="pill pill-${kind}">${escapeHtml(text)}</span>`;
  }

  function statusPill(status) {
    return pill(STATUS_LABELS[status] || status, status);
  }

  function setStatus(el, message, kind = '') {
    el.textContent = message;
    el.className = `status ${kind}`;
  }

  function showLogin() {
    $('#login-view').classList.remove('hidden');
    $('#dashboard-view').classList.add('hidden');
  }

  function showDashboard() {
    $('#login-view').classList.add('hidden');
    $('#dashboard-view').classList.remove('hidden');
    $('#admin-name').textContent = DashboardApi.state.user.name;
    loadOverview();
  }

  function switchView(name) {
    for (const view of document.querySelectorAll('.view')) {
      view.classList.toggle('hidden', view.id !== `view-${name}`);
    }
    for (const item of document.querySelectorAll('.nav-item')) {
      item.classList.toggle('active', item.dataset.view === name);
    }
    if (name === 'overview') loadOverview();
    if (name === 'rides') loadRides();
    if (name === 'users') loadUsers();
  }

  async function loadOverview() {
    const statusEl = $('#global-status');
    try {
      const stats = await DashboardApi.stats();
      $('#metric-rides').textContent = stats.rides.total;
      $('#metric-users').textContent = stats.users.total;
      $('#metric-passengers').textContent = stats.users.byRole.passenger;
      $('#metric-drivers').textContent = stats.users.byRole.driver;
      $('#metric-revenue').textContent = money(stats.revenueCents);

      const entries = Object.entries(stats.rides.byStatus);
      $('#status-breakdown').innerHTML = entries.length
        ? entries
            .map(
              ([status, total]) =>
                `<li><span>${statusPill(status)} ${STATUS_LABELS[status] || status}</span><strong>${total}</strong></li>`,
            )
            .join('')
        : '<li>Nenhuma corrida registrada.</li>';
      setStatus(statusEl, '');
    } catch (err) {
      setStatus(statusEl, err.message, 'error');
    }
  }

  async function loadRides() {
    const statusEl = $('#global-status');
    const body = $('#rides-body');
    try {
      const { rides } = await DashboardApi.rides($('#rides-filter').value);
      body.innerHTML = rides.length
        ? rides
            .map(
              (r) => `
              <tr>
                <td>${r.id}</td>
                <td>${statusPill(r.status)}</td>
                <td>${escapeHtml(r.passengerName ?? '—')}</td>
                <td>${escapeHtml(r.driverName ?? '—')}</td>
                <td>${escapeHtml(r.origin)} → ${escapeHtml(r.destination)}</td>
                <td class="num">${money(r.priceCents)}</td>
                <td>${date(r.createdAt)}</td>
              </tr>`,
            )
            .join('')
        : '<tr><td class="empty" colspan="7">Nenhuma corrida encontrada.</td></tr>';
      setStatus(statusEl, '');
    } catch (err) {
      setStatus(statusEl, err.message, 'error');
    }
  }

  async function loadUsers() {
    const statusEl = $('#global-status');
    const body = $('#users-body');
    try {
      const { users } = await DashboardApi.users($('#users-filter').value);
      body.innerHTML = users.length
        ? users
            .map(
              (u) => `
              <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td>${escapeHtml(u.phone ?? '—')}</td>
                <td>${pill(ROLE_LABELS[u.role] || u.role, u.role)}</td>
                <td>${date(u.createdAt)}</td>
              </tr>`,
            )
            .join('')
        : '<tr><td class="empty" colspan="6">Nenhum usuário encontrado.</td></tr>';
      setStatus(statusEl, '');
    } catch (err) {
      setStatus(statusEl, err.message, 'error');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const statusEl = $('#login-status');
    try {
      const { user, token } = await DashboardApi.signIn(
        form.email.value.trim(),
        form.password.value,
      );
      if (user.role !== 'admin') {
        throw new Error('Esta conta não tem acesso ao painel.');
      }
      DashboardApi.save(user, token);
      setStatus(statusEl, '');
      form.reset();
      showDashboard();
    } catch (err) {
      setStatus(statusEl, err.message, 'error');
    }
  }

  function init() {
    $('#login-form').addEventListener('submit', handleLogin);
    $('#logout').addEventListener('click', () => {
      DashboardApi.clear();
      showLogin();
    });

    for (const item of document.querySelectorAll('.nav-item')) {
      item.addEventListener('click', () => switchView(item.dataset.view));
    }
    $('#rides-refresh').addEventListener('click', loadRides);
    $('#users-refresh').addEventListener('click', loadUsers);
    $('#rides-filter').addEventListener('change', loadRides);
    $('#users-filter').addEventListener('change', loadUsers);

    if (DashboardApi.isAdmin()) showDashboard();
    else showLogin();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Dashboard.init);
