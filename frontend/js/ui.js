'use strict';

// Utilitarios compartilhados: renderizacao de status, dinheiro e mensagens.
const UI = (() => {
  const STATUS_LABELS = {
    requested: 'Aguardando motoboy',
    accepted: 'Aceita',
    in_progress: 'Em andamento',
    completed: 'Concluída',
    canceled: 'Cancelada',
  };

  function money(cents) {
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function badge(status) {
    return `<span class="badge badge-${status}">${statusLabel(status)}</span>`;
  }

  function setStatus(el, message, kind = '') {
    if (!el) return;
    el.textContent = message;
    el.className = `status ${kind}`;
  }

  function rideCard(ride, actionsHtml = '') {
    return `
      <li class="ride" data-ride-id="${ride.id}">
        <div class="ride-head">
          <strong>Corrida #${ride.id}</strong>
          ${badge(ride.status)}
        </div>
        <p class="ride-route">${ride.origin} → ${ride.destination}</p>
        <p class="ride-price">${money(ride.priceCents)}</p>
        ${actionsHtml}
      </li>
    `;
  }

  return { money, statusLabel, badge, setStatus, rideCard };
})();
