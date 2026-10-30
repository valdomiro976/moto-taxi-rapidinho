'use strict';

// MODULO PASSAGEIRO: pede corridas e acompanha o status.
const PassengerModule = (() => {
  const name = 'passenger';

  function template(user) {
    return `
      <h2>Passageiro — <span>${UI.escapeHtml(user.name)}</span></h2>
      <form id="passenger-ride-form">
        <label>
          Origem
          <input type="text" name="origin" placeholder="Rua de partida" required />
        </label>
        <label>
          Destino
          <input type="text" name="destination" placeholder="Para onde vamos?" required />
        </label>
        <label>
          Preço estimado (R$)
          <input type="number" name="price" min="0" step="0.01" value="10.00" />
        </label>
        <div class="actions">
          <button type="submit">Pedir corrida</button>
          <button type="button" id="passenger-refresh" class="secondary">Atualizar</button>
        </div>
      </form>
      <p id="passenger-status" class="status" role="status"></p>
      <h3>Minhas corridas</h3>
      <ul id="passenger-ride-list" class="ride-list"></ul>
    `;
  }

  function mount(root, api) {
    const statusEl = root.querySelector('#passenger-status');
    const listEl = root.querySelector('#passenger-ride-list');

    async function load() {
      try {
        const { rides } = await api.request('/rides/mine');
        listEl.innerHTML = rides.length
          ? rides.map((r) => UI.rideCard(r, cancelButton(r))).join('')
          : '<li>Você ainda não pediu nenhuma corrida.</li>';
      } catch (err) {
        UI.setStatus(statusEl, err.message, 'error');
      }
    }

    function cancelButton(ride) {
      const cancellable = ['requested', 'accepted'].includes(ride.status);
      if (!cancellable) return '';
      return `<div class="actions"><button type="button" class="ghost" data-cancel="${ride.id}">Cancelar corrida</button></div>`;
    }

    root.querySelector('#passenger-ride-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      try {
        await api.request('/rides', {
          method: 'POST',
          body: {
            origin: form.origin.value.trim(),
            destination: form.destination.value.trim(),
            priceCents: Math.round(Number(form.price.value || 0) * 100),
          },
        });
        form.origin.value = '';
        form.destination.value = '';
        UI.setStatus(statusEl, 'Corrida solicitada! Aguardando um motoboy.', 'ok');
        load();
      } catch (err) {
        UI.setStatus(statusEl, err.message, 'error');
      }
    });

    root.querySelector('#passenger-refresh').addEventListener('click', load);

    listEl.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-cancel');
      if (!id) return;
      try {
        await api.request(`/rides/${id}/status`, {
          method: 'PATCH',
          body: { status: 'canceled' },
        });
        UI.setStatus(statusEl, 'Corrida cancelada.', 'ok');
        load();
      } catch (err) {
        UI.setStatus(statusEl, err.message, 'error');
      }
    });

    load();
  }

  return { name, title: 'Passageiro', template, mount };
})();
