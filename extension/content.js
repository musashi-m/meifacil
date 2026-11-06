// Facilita MEI - Content Script para PGMEI da Receita Federal

(function () {
  'use strict';

  // Helper para formatar CNPJ (14 dígitos -> 00.000.000/0000-00)
  function formatCnpj(cnpj) {
    const raw = String(cnpj).replace(/\D/g, '');
    if (raw.length !== 14) return cnpj;
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // Localiza o campo de CNPJ na tela da Receita
  function findCnpjInput() {
    return (
      document.getElementById('cnpj') ||
      document.querySelector('input[name*="cnpj" i]') ||
      document.querySelector('input[id*="cnpj" i]') ||
      document.querySelector('input[placeholder*="cnpj" i]') ||
      document.querySelector('input.cnpj') ||
      document.querySelector('form input[type="text"]')
    );
  }

  // Localiza o botão de Continuar/Enviar
  function findContinueButton() {
    return (
      document.getElementById('btnContinuar') ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      Array.from(document.querySelectorAll('button, a.btn, input[type="button"]')).find((el) =>
        el.textContent.toLowerCase().includes('continuar') || el.value?.toLowerCase().includes('continuar')
      )
    );
  }

  // Exibe toast temporário de feedback
  function showToast(message) {
    const existing = document.querySelector('.fmei-feedback-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'fmei-feedback-toast';
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Preenche o campo de CNPJ com segurança
  function fillCnpj(cnpjVal, clientName) {
    const input = findCnpjInput();
    if (!input) {
      alert('Campo de CNPJ não encontrado nesta página. Certifique-se de estar na tela de Identificação do PGMEI.');
      return;
    }

    const clean = cnpjVal.replace(/\D/g, '');
    const formatted = formatCnpj(clean);

    input.focus();

    // Testa preencher tanto o valor formatado quanto dispara eventos necessários para masks jQuery/JS
    input.value = formatted;

    const events = ['input', 'change', 'keydown', 'keypress', 'keyup', 'blur'];
    events.forEach((evtName) => {
      input.dispatchEvent(new Event(evtName, { bubbles: true }));
    });

    // Se o valor estiver vazio por causa de máscara estrita, tenta o valor limpo
    if (!input.value) {
      input.value = clean;
      events.forEach((evtName) => {
        input.dispatchEvent(new Event(evtName, { bubbles: true }));
      });
    }

    // Destaque visual no campo
    input.classList.add('fmei-input-highlight');
    setTimeout(() => {
      input.classList.remove('fmei-input-highlight');
    }, 2000);

    // Foca o botão Continuar
    const btn = findContinueButton();
    if (btn) {
      btn.focus();
    }

    showToast(`CNPJ de "${clientName || 'Cliente'}" preenchido com sucesso!`);
  }

  // Renderiza o widget flutuante na página
  function renderWidget(clients) {
    let widget = document.getElementById('facilita-mei-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'facilita-mei-widget';
      document.body.appendChild(widget);
    }

    const count = clients ? clients.length : 0;

    let itemsHtml = '';
    if (count === 0) {
      itemsHtml = `
        <div class="fmei-empty">
          <p>Nenhum MEI cadastrado.</p>
          <span style="font-size: 11px;">Abra a extensão pelo ícone no navegador para cadastrar seus clientes!</span>
        </div>
      `;
    } else {
      itemsHtml = `
        <ul class="fmei-list">
          ${clients
            .map(
              (c, idx) => `
            <li class="fmei-item" data-index="${idx}">
              <div class="fmei-item-info">
                <span class="fmei-item-name">${escapeHtml(c.name || 'Sem nome')}</span>
                <span class="fmei-item-cnpj">${formatCnpj(c.cnpj)}</span>
              </div>
              <span class="fmei-item-action">Preencher</span>
            </li>
          `
            )
            .join('')}
        </ul>
      `;
    }

    widget.innerHTML = `
      <div class="fmei-header" id="fmei-header-btn">
        <div class="fmei-header-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          <span>Facilita MEI</span>
          <span class="fmei-badge-count">${count}</span>
        </div>
        <button class="fmei-btn-toggle" title="Minimizar / Expandir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="fmei-body">
        <div class="fmei-info">
          <span>Selecione para preencher:</span>
        </div>
        ${itemsHtml}
      </div>
    `;

    // Eventos do cabeçalho / minimizar
    const header = widget.querySelector('#fmei-header-btn');
    header.addEventListener('click', (e) => {
      widget.classList.toggle('minimized');
    });

    // Eventos dos itens
    const items = widget.querySelectorAll('.fmei-item');
    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(item.getAttribute('data-index'), 10);
        const client = clients[index];
        if (client) {
          fillCnpj(client.cnpj, client.name);
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Carrega clientes do storage
  function loadClients() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['facilita_mei_clients'], (result) => {
        const clients = result.facilita_mei_clients || [];
        renderWidget(clients);
      });
    }
  }

  // Ouve mudanças no storage em tempo real
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.facilita_mei_clients) {
        renderWidget(changes.facilita_mei_clients.newValue || []);
      }
    });
  }

  // Inicia quando a página estiver carregada
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClients);
  } else {
    loadClients();
  }
})();

