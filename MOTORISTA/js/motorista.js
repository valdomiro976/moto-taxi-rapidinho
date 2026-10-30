'use strict';

// MODULO MOTORISTA: ve a fila de corridas pendentes, aceita e conclui.
const DriverModule = (() => {
  const name = 'driver';

  function template(user) {
    return `
      <h2>Motorista — <span>${UI.escapeHtml(user.name)}</span></h2>
      <div class="actions">
        <button type="button" id="driver-refresh">Atualizar corridas disponíveis</button>
      </div>
      <p id="driver-status" class="status" role="status"></p>

      <h3>Corridas disponíveis</h3>
      <ul id="driver-available-list" class="ride-list"></ul>

      <h3>Minhas corridas</h3>
      <ul id="driver-mine-list" class="ride-list"></ul>
    `;
  }

  function acceptButton(ride) {
    return `<div class="actions"><button type="button" data-accept="${ride.id}">Aceitar corrida</button></div>`;
  }

  function progressButton(ride) {
    if (ride.status === 'accepted') {
      return `<div class="actions"><button type="button" data-next="${ride.id}" data-status="in_progress">Iniciar corrida</button></div>`;
    }
    if (ride.status === 'in_progress') {
      return `<div class="actions"><button type="button" data-next="${ride.id}" data-status="completed">Concluir corrida</button></div>`;
    }
    return '';
  }

  function mount(root, api) {
    const statusEl = root.querySelector('#driver-status');
    const availableEl = root.querySelector('#driver-available-list');
    const mineEl = root.querySelector('#driver-mine-list');

    async function load() {
      try {
        const [available, mine] = await Promise.all([
          api.request('/rides/available'),
          api.request('/rides/mine'),
        ]);
        availableEl.innerHTML = available.rides.length
          ? available.rides.map((r) => UI.rideCard(r, acceptButton(r))).join('')
          : '<li>Nenhuma corrida pendente no momento.</li>';
        mineEl.innerHTML = mine.rides.length
          ? mine.rides.map((r) => UI.rideCard(r, progressButton(r))).join('')
          : '<li>Você ainda não aceitou nenhuma corrida.</li>';
      } catch (err) {
        UI.setStatus(statusEl, err.message, 'error');
      }
    }

    async function changeStatus(id, status, successMessage) {
      try {
        await api.request(`/rides/${id}/status`, { method: 'PATCH', body: { status } });
        UI.setStatus(statusEl, successMessage, 'ok');
        load();
      } catch (err) {
        UI.setStatus(statusEl, err.message, 'error');
      }
    }

    root.querySelector('#driver-refresh').addEventListener('click', load);

    root.addEventListener('click', (e) => {
      const acceptId = e.target.getAttribute('data-accept');
      if (acceptId) {
        changeStatus(acceptId, 'accepted', 'Corrida aceita! Boa viagem.');
        return;
      }
      const nextId = e.target.getAttribute('data-next');
      if (nextId) {
        const next = e.target.getAttribute('data-status');
        const message = next === 'completed' ? 'Corrida concluída!' : 'Corrida iniciada!';
        changeStatus(nextId, next, message);
      }
    });

    load();
  }

  return { name, title: 'Motorista', template, mount };
})();
