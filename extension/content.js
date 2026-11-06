// Facilita MEI - Content Script para PGMEI e Portal NFS-e Nacional

(function () {
  'use strict';

  const isNfseSite = window.location.hostname.includes('nfse.gov.br');
  const isPgmeiSite = window.location.hostname.includes('receita.fazenda.gov.br') && window.location.pathname.includes('pgmei');

  // Helper para formatar CNPJ (14 dígitos -> 00.000.000/0000-00)
  function formatCnpj(cnpj) {
    const raw = String(cnpj || '').replace(/\D/g, '');
    if (raw.length !== 14) return cnpj;
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  // Helper para formatar CPF (11 dígitos -> 000.000.000-00)
  function formatCpf(cpf) {
    const raw = String(cpf || '').replace(/\D/g, '');
    if (raw.length !== 11) return cpf;
    return raw.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  // Localiza o campo de CNPJ no PGMEI
  function findPgmeiCnpjInput() {
    return (
      document.getElementById('cnpj') ||
      document.querySelector('input[name*="cnpj" i]') ||
      document.querySelector('input[id*="cnpj" i]') ||
      document.querySelector('input[placeholder*="cnpj" i]') ||
      document.querySelector('input.cnpj') ||
      document.querySelector('form input[type="text"]')
    );
  }

  // Localiza os campos de Login e Senha no Portal da NFS-e Nacional
  function findNfseInputs() {
    const userField =
      document.getElementById('Inscricao') ||
      document.getElementById('CpfCnpj') ||
      document.getElementById('cpf') ||
      document.getElementById('cnpj') ||
      document.querySelector('input[name*="inscricao" i]') ||
      document.querySelector('input[name*="cpf" i]') ||
      document.querySelector('input[name*="cnpj" i]') ||
      document.querySelector('input[name*="login" i]') ||
      document.querySelector('input[name*="usuario" i]') ||
      document.querySelector('form input[type="text"]');

    const passField =
      document.getElementById('Senha') ||
      document.getElementById('password') ||
      document.querySelector('input[name*="senha" i]') ||
      document.querySelector('input[type="password"]');

    const submitBtn =
      document.getElementById('btnEntrar') ||
      document.getElementById('btnAcessar') ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      Array.from(document.querySelectorAll('button, a.btn, input[type="button"]')).find((el) => {
        const txt = (el.textContent || el.value || '').toLowerCase();
        return txt.includes('entrar') || txt.includes('acessar') || txt.includes('login');
      });

    return { userField, passField, submitBtn };
  }

  // Localiza o botão de Continuar no PGMEI
  function findPgmeiContinueButton() {
    return (
      document.getElementById('btnContinuar') ||
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      Array.from(document.querySelectorAll('button, a.btn, input[type="button"]')).find((el) =>
        (el.textContent || el.value || '').toLowerCase().includes('continuar')
      )
    );
  }

  // Dispara eventos em um input para atualizar listeners JS/Angular/React/jQuery
  function triggerInputEvents(input, val) {
    if (!input) return;
    input.focus();
    input.value = val;
    const events = ['input', 'change', 'keydown', 'keypress', 'keyup', 'blur'];
    events.forEach((evtName) => {
      input.dispatchEvent(new Event(evtName, { bubbles: true }));
    });
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
    setTimeout(() => toast.remove(), 3200);
  }

  // Preenchimento no PGMEI
  function fillPgmei(client) {
    const input = findPgmeiCnpjInput();
    if (!input) {
      alert('Campo de CNPJ não encontrado. Certifique-se de estar na tela de Identificação do PGMEI.');
      return;
    }

    const clean = (client.cnpj || '').replace(/\D/g, '');
    const formatted = formatCnpj(clean);

    triggerInputEvents(input, formatted);
    if (!input.value) {
      triggerInputEvents(input, clean);
    }

    input.classList.add('fmei-input-highlight');
    setTimeout(() => input.classList.remove('fmei-input-highlight'), 2000);

    const btn = findPgmeiContinueButton();
    if (btn) btn.focus();

    showToast(`✓ CNPJ de "${client.name}" preenchido!`);
  }

  // Preenchimento no Portal da NFS-e Nacional
  function fillNfse(client) {
    const { userField, passField, submitBtn } = findNfseInputs();

    if (!userField && !passField) {
      alert('Campos de login da NFS-e Nacional não encontrados nesta página. Acesse a tela de Login do Emissor Nacional.');
      return;
    }

    // Identificação: usa CPF se disponível e pedido, ou CNPJ
    const userVal = client.cpf || client.cnpj || '';
    const cleanUser = userVal.replace(/\D/g, '');

    if (userField) {
      const formattedUser = cleanUser.length === 11 ? formatCpf(cleanUser) : formatCnpj(cleanUser);
      triggerInputEvents(userField, formattedUser);
      if (!userField.value) {
        triggerInputEvents(userField, cleanUser);
      }
      userField.classList.add('fmei-input-highlight');
      setTimeout(() => userField.classList.remove('fmei-input-highlight'), 2000);
    }

    // Senha Web
    if (passField && client.nfsePassword) {
      triggerInputEvents(passField, client.nfsePassword);
      passField.classList.add('fmei-input-highlight');
      setTimeout(() => passField.classList.remove('fmei-input-highlight'), 2000);
    }

    if (submitBtn) {
      submitBtn.focus();
    }

    if (client.nfsePassword) {
      showToast(`✓ Login e Senha NFS-e de "${client.name}" preenchidos!`);
    } else {
      showToast(`✓ Usuário de "${client.name}" preenchido! (Sem senha cadastrada)`);
    }
  }

  // Preenchimento unificado
  function handleClientSelect(client) {
    if (isNfseSite) {
      fillNfse(client);
    } else {
      fillPgmei(client);
    }
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
    const portalName = isNfseSite ? 'NFS-e Nacional' : 'PGMEI';

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
                <span class="fmei-item-cnpj">
                  ${formatCnpj(c.cnpj)}
                  ${isNfseSite && c.nfsePassword ? '<span style="color:#059669; font-weight:bold; margin-left:4px;">🔑 Senha salva</span>' : ''}
                </span>
              </div>
              <span class="fmei-item-action">${isNfseSite ? 'Entrar' : 'Preencher'}</span>
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
          <span>Facilita MEI • ${portalName}</span>
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
          <span>Selecione para preencher ${isNfseSite ? 'login e senha' : 'o CNPJ'}:</span>
        </div>
        ${itemsHtml}
      </div>
    `;

    // Minimizar
    const header = widget.querySelector('#fmei-header-btn');
    header.addEventListener('click', () => {
      widget.classList.toggle('minimized');
    });

    // Clique no item
    const items = widget.querySelectorAll('.fmei-item');
    items.forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(item.getAttribute('data-index'), 10);
        const client = clients[index];
        if (client) {
          handleClientSelect(client);
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str || '')
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClients);
  } else {
    loadClients();
  }
})();
