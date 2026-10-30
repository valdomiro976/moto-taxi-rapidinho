'use strict';

// Casca da aplicacao: autenticacao e troca entre os modulos.
const App = (() => {
  const MODULES = {
    passenger: PassengerModule,
    driver: DriverModule,
  };

  function $(sel) {
    return document.querySelector(sel);
  }

  function showAuth() {
    $('#auth').classList.remove('hidden');
    $('#workspace').classList.add('hidden');
  }

  function showWorkspace() {
    const user = MotoTaxi.state.user;
    $('#auth').classList.add('hidden');
    $('#workspace').classList.remove('hidden');
    $('#current-user').textContent = `${user.name} · ${MODULES[user.role].title}`;
    mountModule(user.role);
  }

  function mountModule(role) {
    const module = MODULES[role];
    const container = $('#module-container');
    container.innerHTML = module.template(MotoTaxi.state.user);
    module.mount(container);
  }

  async function handleAuth(action) {
    const form = $('#auth-form');
    const statusEl = $('#auth-status');
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      role: form.role.value,
    };

    try {
      const data = action === 'register'
        ? await MotoTaxi.register(payload)
        : await MotoTaxi.signIn({ email: payload.email, password: payload.password });
      MotoTaxi.login(data.user, data.token);
      UI.setStatus(statusEl, '');
      showWorkspace();
    } catch (err) {
      UI.setStatus(statusEl, err.message, 'error');
    }
  }

  function init() {
    $('#auth-form').addEventListener('submit', (e) => {
      e.preventDefault();
      handleAuth('login');
    });
    $('#auth-form [data-action="register"]').addEventListener('click', () => handleAuth('register'));
    $('#logout').addEventListener('click', () => {
      MotoTaxi.logout();
      showAuth();
    });

    if (MotoTaxi.isLoggedIn()) showWorkspace();
    else showAuth();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
