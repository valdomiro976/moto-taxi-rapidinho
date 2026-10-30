'use strict';

// Casca compartilhada pelos apps Passageiro e Motorista: login, sessao e
// montagem do modulo. Cada app passa seu proprio cliente de API e papel.
function startApp({ api, module, role }) {
  const $ = (sel) => document.querySelector(sel);

  function showAuth() {
    $('#auth').classList.remove('hidden');
    $('#workspace').classList.add('hidden');
  }

  function showWorkspace() {
    const user = api.state.user;
    $('#auth').classList.add('hidden');
    $('#workspace').classList.remove('hidden');
    $('#current-user').textContent = `${user.name} · ${module.title}`;
    mountModule();
  }

  function mountModule() {
    const container = $('#module-container');
    container.innerHTML = module.template(api.state.user);
    module.mount(container, api);
  }

  async function handleAuth(action) {
    const form = $('#auth-form');
    const statusEl = $('#auth-status');
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      role,
    };

    try {
      const data = action === 'register'
        ? await api.register(payload)
        : await api.signIn({ email: payload.email, password: payload.password });
      api.login(data.user, data.token);
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
      api.logout();
      showAuth();
    });

    if (api.isLoggedIn()) showWorkspace();
    else showAuth();
  }

  document.addEventListener('DOMContentLoaded', init);
}
