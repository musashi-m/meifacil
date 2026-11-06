// Facilita MEI - Popup Logic

const PGMEI_URL = 'https://www8.receita.fazenda.gov.br/simplesnacional/aplicacoes/atspo/pgmei.app/identificacao';

// Estado local
let clients = [];

// Elementos da DOM
const tabButtons = document.querySelectorAll('.nav-tab');
const tabContents = document.querySelectorAll('.tab-content');
const clientsListEl = document.getElementById('clientsList');
const clientsCountEl = document.getElementById('clientsCount');
const searchInput = document.getElementById('searchInput');
const toastEl = document.getElementById('toast');
const btnOpenPgmei = document.getElementById('btnOpenPgmei');

// Formulário de Cadastro
const form = document.getElementById('addClientForm');
const newCnpjInput = document.getElementById('newCnpj');
const newNameInput = document.getElementById('newName');
const newRazaoInput = document.getElementById('newRazao');
const newPhoneInput = document.getElementById('newPhone');
const cnpjStatus = document.getElementById('cnpjStatus');
const btnConsultarCnpj = document.getElementById('btnConsultarCnpj');

// Export / Import
const btnExportData = document.getElementById('btnExportData');
const fileImport = document.getElementById('fileImport');

// --- Helpers de Máscara e Formatação ---
function cleanDigits(val) {
  return String(val || '').replace(/\D/g, '');
}

function formatCnpj(val) {
  const digits = cleanDigits(val).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatPhone(val) {
  const digits = cleanDigits(val).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// --- Toast Feedback ---
let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2500);
}

// --- Alternância de Abas ---
tabButtons.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-tab');
    tabButtons.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

function switchTab(tabId) {
  const btn = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

// --- Carregar e Salvar Clientes ---
function loadData() {
  chrome.storage.local.get(['facilita_mei_clients'], (res) => {
    clients = res.facilita_mei_clients || [];
    renderClients();
  });
}

function saveData(callback) {
  chrome.storage.local.set({ facilita_mei_clients: clients }, () => {
    renderClients();
    if (callback) callback();
  });
}

// --- Renderizar Lista ---
function renderClients(filterText = '') {
  clientsCountEl.textContent = clients.length;
  clientsListEl.innerHTML = '';

  const query = filterText.toLowerCase().trim();
  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query) ||
      (c.razao && c.razao.toLowerCase().includes(query)) ||
      c.cnpj.includes(cleanDigits(query))
  );

  if (filtered.length === 0) {
    clientsListEl.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <p>${clients.length === 0 ? 'Nenhum MEI cadastrado' : 'Nenhum resultado encontrado'}</p>
        <span>${clients.length === 0 ? 'Clique na aba "Cadastrar" para adicionar seu primeiro CNPJ.' : 'Tente pesquisar com outro termo.'}</span>
      </div>
    `;
    return;
  }

  filtered.forEach((client) => {
    const card = document.createElement('div');
    card.className = 'client-card';

    const formattedCnpj = formatCnpj(client.cnpj);

    card.innerHTML = `
      <div class="client-header">
        <div>
          <div class="client-title">${escapeHtml(client.name)}</div>
          ${client.razao ? `<div class="client-razao" title="${escapeHtml(client.razao)}">${escapeHtml(client.razao)}</div>` : ''}
        </div>
        <span class="client-cnpj-badge">${formattedCnpj}</span>
      </div>
      <div class="client-actions">
        <button class="btn-action-copy" data-cnpj="${client.cnpj}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copiar CNPJ
        </button>
        <button class="btn-action-open" data-cnpj="${client.cnpj}" title="Copiar e abrir o PGMEI direto">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Abrir
        </button>
        <button class="btn-action-delete" data-id="${client.id}" title="Excluir">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Evento Copiar
    card.querySelector('.btn-action-copy').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(client.cnpj).then(() => {
        showToast('✓ CNPJ copiado para a área de transferência!');
      });
    });

    // Evento Abrir PGMEI + Copiar
    card.querySelector('.btn-action-open').addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(client.cnpj).then(() => {
        showToast('✓ CNPJ copiado! Abrindo PGMEI...');
        chrome.tabs.create({ url: PGMEI_URL });
      });
    });

    // Evento Deletar
    card.querySelector('.btn-action-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Deseja remover o MEI "${client.name}"?`)) {
        clients = clients.filter((c) => c.id !== client.id);
        saveData(() => showToast('MEI removido com sucesso.'));
      }
    });

    clientsListEl.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Consulta Automática BrasilAPI ---
async function fetchCnpjInfo(cnpjDigits) {
  if (cnpjDigits.length !== 14) return;

  cnpjStatus.textContent = 'Consultando Receita Federal (BrasilAPI)...';
  cnpjStatus.className = 'field-hint loading';

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`);
    if (!res.ok) throw new Error('Não encontrado');
    const data = await res.json();

    if (data.razao_social) {
      newRazaoInput.value = data.razao_social;
      if (!newNameInput.value) {
        // Se tiver nome fantasia, usa como apelido. Senão, primeiro nome ou razão.
        newNameInput.value = data.nome_fantasia || data.razao_social;
      }
      cnpjStatus.textContent = `✓ Encontrado: ${data.razao_social} (${data.descricao_situacao_cadastral || 'Ativa'})`;
      cnpjStatus.className = 'field-hint success';
    }
  } catch (err) {
    cnpjStatus.textContent = 'CNPJ não encontrado na consulta automática. Você pode preencher os dados manualmente.';
    cnpjStatus.className = 'field-hint error';
  }
}

// Máscaras de entrada
newCnpjInput.addEventListener('input', (e) => {
  e.target.value = formatCnpj(e.target.value);
  const clean = cleanDigits(e.target.value);
  if (clean.length === 14) {
    fetchCnpjInfo(clean);
  } else {
    cnpjStatus.textContent = 'Digite os 14 dígitos do CNPJ para buscar automaticamente.';
    cnpjStatus.className = 'field-hint';
  }
});

btnConsultarCnpj.addEventListener('click', () => {
  const clean = cleanDigits(newCnpjInput.value);
  if (clean.length === 14) {
    fetchCnpjInfo(clean);
  } else {
    alert('Por favor, informe os 14 dígitos do CNPJ.');
  }
});

newPhoneInput.addEventListener('input', (e) => {
  e.target.value = formatPhone(e.target.value);
});

// Salvar Novo MEI
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const cleanCnpj = cleanDigits(newCnpjInput.value);
  const name = newNameInput.value.trim();
  const razao = newRazaoInput.value.trim();
  const phone = cleanDigits(newPhoneInput.value);

  if (cleanCnpj.length !== 14) {
    alert('O CNPJ deve ter exatamente 14 dígitos.');
    return;
  }

  if (!name) {
    alert('Por favor, informe um apelido ou nome para o cliente.');
    return;
  }

  // Verifica se já existe
  const exists = clients.some((c) => c.cnpj === cleanCnpj);
  if (exists) {
    if (!confirm('Este CNPJ já está cadastrado. Deseja cadastrar/atualizar mesmo assim?')) {
      return;
    }
  }

  const newClient = {
    id: Date.now(),
    cnpj: cleanCnpj,
    name,
    razao: razao || name,
    phone: phone || '',
    createdAt: new Date().toISOString()
  };

  clients.unshift(newClient);
  saveData(() => {
    showToast('✓ MEI cadastrado com sucesso!');
    form.reset();
    cnpjStatus.textContent = 'Digite os 14 dígitos do CNPJ para buscar automaticamente.';
    cnpjStatus.className = 'field-hint';
    switchTab('tab-list');
  });
});

// Pesquisa
searchInput.addEventListener('input', (e) => {
  renderClients(e.target.value);
});

// Botão direto para o PGMEI
btnOpenPgmei.addEventListener('click', () => {
  chrome.tabs.create({ url: PGMEI_URL });
});

// --- Exportar & Importar Backup ---
btnExportData.addEventListener('click', () => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(clients, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute('href', dataStr);
  dlAnchorElem.setAttribute('download', `facilita-mei-backup-${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchorElem.click();
  showToast('✓ Backup exportado com sucesso!');
});

fileImport.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) {
        throw new Error('Formato inválido. O arquivo deve conter uma lista de MEIs.');
      }

      // Mescla com existentes sem duplicar CNPJs
      let addedCount = 0;
      imported.forEach((item) => {
        const cleanCnpj = cleanDigits(item.cnpj);
        if (cleanCnpj.length === 14 && !clients.some((c) => c.cnpj === cleanCnpj)) {
          clients.push({
            id: item.id || Date.now() + Math.random(),
            cnpj: cleanCnpj,
            name: item.name || 'Cliente Importado',
            razao: item.razao || item.name || '',
            phone: cleanDigits(item.phone || ''),
            createdAt: item.createdAt || new Date().toISOString()
          });
          addedCount++;
        }
      });

      saveData(() => {
        showToast(`✓ ${addedCount} MEIs importados com sucesso!`);
        switchTab('tab-list');
      });
    } catch (err) {
      alert('Erro ao importar arquivo: ' + err.message);
    }
    fileImport.value = '';
  };
  reader.readAsText(file);
});

// Inicialização
document.addEventListener('DOMContentLoaded', loadData);

