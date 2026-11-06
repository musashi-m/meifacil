// Facilita MEI - Web App Logic

const STORAGE_KEY = 'facilita_mei_data';
const PGMEI_URL = 'https://www8.receita.fazenda.gov.br/simplesnacional/aplicacoes/atspo/pgmei.app/identificacao';
const NFSE_URL = 'https://www.nfse.gov.br/EmissorNacional/Login';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Estado da Aplicação
let appData = {
  clients: [],
  history: {} // Formato: { "YYYY-MM": { "cnpjDigits": { status, pix, barcode, hasFile, fileName } } }
};

let currentDate = new Date();
let currentFilter = 'all'; // 'all' | 'pending' | 'emitted' | 'paid'
let searchQuery = '';

// Elementos DOM Principais
const currentMonthLabel = document.getElementById('currentMonthLabel');
const btnPrevMonth = document.getElementById('btnPrevMonth');
const btnNextMonth = document.getElementById('btnNextMonth');

const metricTotal = document.getElementById('metricTotal');
const metricPending = document.getElementById('metricPending');
const metricDone = document.getElementById('metricDone');

const filterSearch = document.getElementById('filterSearch');
const filterPills = document.querySelectorAll('.filter-pills .pill');
const clientsContainer = document.getElementById('clientsContainer');

// Modal: Cliente (Adicionar / Editar)
const modalClient = document.getElementById('modalClient');
const modalClientTitle = document.getElementById('modalClientTitle');
const formClient = document.getElementById('formClient');
const clientIdInput = document.getElementById('clientId');
const inputCnpj = document.getElementById('inputCnpj');
const inputName = document.getElementById('inputName');
const inputRazao = document.getElementById('inputRazao');
const inputPhone = document.getElementById('inputPhone');
const inputNotes = document.getElementById('inputNotes');
const inputNfsePassword = document.getElementById('inputNfsePassword');
const inputCpf = document.getElementById('inputCpf');
const inputNfseService = document.getElementById('inputNfseService');
const btnToggleNfseWebPass = document.getElementById('btnToggleNfseWebPass');
const apiStatusText = document.getElementById('apiStatusText');
const btnBuscarBrasilApi = document.getElementById('btnBuscarBrasilApi');

const btnOpenAddModal = document.getElementById('btnOpenAddModal');
const btnHeaderAdd = document.getElementById('btnHeaderAdd');
const fabAdd = document.getElementById('fabAdd');
const btnCloseModalClient = document.getElementById('btnCloseModalClient');
const btnCancelModalClient = document.getElementById('btnCancelModalClient');

// Modal: Sincronização
const modalSync = document.getElementById('modalSync');
const btnOpenSyncModal = document.getElementById('btnOpenSyncModal');
const btnCloseModalSync = document.getElementById('btnCloseModalSync');
const btnExportJson = document.getElementById('btnExportJson');
const inputImportJson = document.getElementById('inputImportJson');

// Modal: Guia do Mês (PDF, Pix, Código de Barras)
const modalGuide = document.getElementById('modalGuide');
const modalGuideTitle = document.getElementById('modalGuideTitle');
const modalGuideSubtitle = document.getElementById('modalGuideSubtitle');
const formGuide = document.getElementById('formGuide');
const guideClientCnpj = document.getElementById('guideClientCnpj');
const inputGuideFile = document.getElementById('inputGuideFile');
const fileUploadBox = document.getElementById('fileUploadBox');
const fileUploadPrompt = document.getElementById('fileUploadPrompt');
const fileAttachedInfo = document.getElementById('fileAttachedInfo');
const attachedFileName = document.getElementById('attachedFileName');
const btnViewAttachedFile = document.getElementById('btnViewAttachedFile');
const btnRemoveAttachedFile = document.getElementById('btnRemoveAttachedFile');
const inputGuidePix = document.getElementById('inputGuidePix');
const btnPastePix = document.getElementById('btnPastePix');
const inputGuideBarcode = document.getElementById('inputGuideBarcode');
const btnPasteBarcode = document.getElementById('btnPasteBarcode');
const btnCloseModalGuide = document.getElementById('btnCloseModalGuide');
const btnCancelModalGuide = document.getElementById('btnCancelModalGuide');
const btnSaveAndSendGuide = document.getElementById('btnSaveAndSendGuide');

// Estado temporário da Guia sendo editada
let currentGuideClient = null;
let currentGuideTempFile = null;
let isGuideFileRemoved = false;

const toastEl = document.getElementById('toast');

// --- IndexedDB para Armazenamento Local de Arquivos (PDFs) ---
function openFilesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('FacilitaMeiFilesDB', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function saveFileToIndexedDB(key, fileBlob, fileName, fileType) {
  try {
    const db = await openFilesDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.put({ key, blob: fileBlob, name: fileName, type: fileType });
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Erro ao salvar no IndexedDB', err);
  }
}

async function getFileFromIndexedDB(key) {
  try {
    const db = await openFilesDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Erro ao ler do IndexedDB', err);
    return null;
  }
}

async function deleteFileFromIndexedDB(key) {
  try {
    const db = await openFilesDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Erro ao excluir do IndexedDB', err);
  }
}

function viewOrDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'guia-das.pdf';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

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

function formatCpf(val) {
  const digits = cleanDigits(val).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function formatPhone(val) {
  const digits = cleanDigits(val).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getCurrentMonthKey() {
  const y = currentDate.getFullYear();
  const m = String(currentDate.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMonthDisplayString() {
  const m = currentDate.getMonth();
  const y = currentDate.getFullYear();
  return `${MONTH_NAMES[m]} / ${y}`;
}

// --- Toast Feedback ---
let toastTimeout;
function showToast(msg) {
  clearTimeout(toastTimeout);
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2600);
}

// --- Persistência Local ---
function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        appData.clients = parsed;
      } else {
        appData.clients = parsed.clients || [];
        appData.history = parsed.history || {};
      }
    }
  } catch (err) {
    console.error('Erro ao ler localStorage', err);
  }
}

function saveStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (err) {
    console.error('Erro ao salvar localStorage', err);
  }
}

// --- Controle de Status e Dados da Guia do Mês ---
function getClientMonthData(cnpj) {
  const monthKey = getCurrentMonthKey();
  if (!appData.history[monthKey]) {
    appData.history[monthKey] = {};
  }
  const val = appData.history[monthKey][cnpj];
  if (!val) {
    return { status: 'pending', pix: '', barcode: '', hasFile: false, fileName: '' };
  }
  if (typeof val === 'string') {
    return { status: val, pix: '', barcode: '', hasFile: false, fileName: '' };
  }
  return {
    status: val.status || 'pending',
    pix: val.pix || '',
    barcode: val.barcode || '',
    hasFile: !!val.hasFile,
    fileName: val.fileName || ''
  };
}

function getClientMonthStatus(cnpj) {
  return getClientMonthData(cnpj).status;
}

function setClientMonthStatus(cnpj, status) {
  const monthKey = getCurrentMonthKey();
  if (!appData.history[monthKey]) {
    appData.history[monthKey] = {};
  }
  const current = getClientMonthData(cnpj);
  appData.history[monthKey][cnpj] = {
    ...current,
    status
  };
  saveStorage();
  updateMetrics();
  renderCards();
}

function updateClientMonthGuideData(cnpj, { pix, barcode, hasFile, fileName }) {
  const monthKey = getCurrentMonthKey();
  if (!appData.history[monthKey]) {
    appData.history[monthKey] = {};
  }
  const current = getClientMonthData(cnpj);
  appData.history[monthKey][cnpj] = {
    ...current,
    pix: pix !== undefined ? pix : current.pix,
    barcode: barcode !== undefined ? barcode : current.barcode,
    hasFile: hasFile !== undefined ? hasFile : current.hasFile,
    fileName: fileName !== undefined ? fileName : current.fileName,
    status: current.status === 'pending' ? 'emitted' : current.status
  };
  saveStorage();
  updateMetrics();
  renderCards();
}

function toggleNextStatus(cnpj) {
  const current = getClientMonthStatus(cnpj);
  let next = 'emitted';
  if (current === 'pending') next = 'emitted';
  else if (current === 'emitted') next = 'paid';
  else if (current === 'paid') next = 'pending';

  setClientMonthStatus(cnpj, next);
  const statusLabels = { pending: 'Pendente', emitted: 'Emitida', paid: 'Paga' };
  showToast(`Status atualizado para: ${statusLabels[next]}`);
}

// --- Atualizar Métricas ---
function updateMetrics() {
  const total = appData.clients.length;
  let pendingCount = 0;
  let doneCount = 0;

  appData.clients.forEach((c) => {
    const st = getClientMonthStatus(c.cnpj);
    if (st === 'pending') pendingCount++;
    else doneCount++;
  });

  metricTotal.textContent = total;
  metricPending.textContent = pendingCount;
  metricDone.textContent = doneCount;
  currentMonthLabel.textContent = getMonthDisplayString();
}

// --- Envio Inteligente para o WhatsApp ---
async function sendWhatsApp(client) {
  const monthKey = getCurrentMonthKey();
  const guideData = getClientMonthData(client.cnpj);
  const fileKey = `${monthKey}_${client.cnpj}`;

  let attachedFileData = null;
  if (guideData.hasFile) {
    attachedFileData = await getFileFromIndexedDB(fileKey);
  }

  const monthName = MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  let message = `Olá ${client.name}! Tudo bem?\n\nPassando para avisar que a sua guia do MEI (DAS) referente a *${monthName}/${year}* já está pronta.`;

  if (guideData.pix) {
    message += `\n\n🔑 *Pix Copia e Cola:*\n\`\`\`${guideData.pix}\`\`\``;
  }

  if (guideData.barcode) {
    message += `\n\n📊 *Código de Barras:*\n\`\`\`${guideData.barcode}\`\`\``;
  }

  if (attachedFileData) {
    message += `\n\n📎 O boleto em PDF segue em anexo.`;
  }

  if (attachedFileData && navigator.canShare) {
    try {
      const file = new File([attachedFileData.blob], attachedFileData.name, {
        type: attachedFileData.type || 'application/pdf'
      });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Guia DAS MEI - ${client.name}`,
          text: message,
          files: [file]
        });
        showToast('✓ Compartilhamento aberto!');
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Web Share falhou ou cancelado, fallback para wa.me', err);
    }
  }

  const cleanPhone = cleanDigits(client.phone);
  const encodedMsg = encodeURIComponent(message);
  const waUrl = cleanPhone.length >= 10
    ? `https://wa.me/55${cleanPhone}?text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  window.open(waUrl, '_blank');

  if (attachedFileData) {
    viewOrDownloadBlob(attachedFileData.blob, attachedFileData.name);
    showToast('✓ WhatsApp aberto e PDF baixado para você arrastar!');
  } else {
    showToast('✓ Abrindo conversa no WhatsApp...');
  }
}

// --- Renderizar Cards de MEI ---
function renderCards() {
  clientsContainer.innerHTML = '';

  const q = searchQuery.toLowerCase().trim();
  const filtered = appData.clients.filter((client) => {
    const status = getClientMonthStatus(client.cnpj);
    
    if (currentFilter !== 'all' && status !== currentFilter) {
      return false;
    }

    if (q) {
      const matchName = (client.name || '').toLowerCase().includes(q);
      const matchRazao = (client.razao || '').toLowerCase().includes(q);
      const matchCnpj = (client.cnpj || '').includes(cleanDigits(q));
      return matchName || matchRazao || matchCnpj;
    }

    return true;
  });

  if (filtered.length === 0) {
    clientsContainer.innerHTML = `
      <div class="empty-state-card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <h3>${appData.clients.length === 0 ? 'Nenhum MEI cadastrado ainda' : 'Nenhum resultado com esses filtros'}</h3>
        <p>${appData.clients.length === 0 ? 'Cadastre os CNPJs que você costuma emitir para ter acesso rápido com 1 clique.' : 'Tente mudar o filtro de status ou o termo de busca.'}</p>
        ${appData.clients.length === 0 ? `
          <button id="btnEmptyAdd" class="btn-empty-add">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Cadastrar Primeiro MEI</span>
          </button>
        ` : ''}
      </div>
    `;

    const btnEmpty = document.getElementById('btnEmptyAdd');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', openAddModal);
    }
    return;
  }

  filtered.forEach((client) => {
    const card = document.createElement('div');
    card.className = 'mei-card';

    const guideData = getClientMonthData(client.cnpj);
    const status = guideData.status;
    const formattedCnpj = formatCnpj(client.cnpj);
    const hasNfse = Boolean(client.nfsePassword);

    const statusConfig = {
      pending: { label: 'Pendente', cssClass: 'status-pending' },
      emitted: { label: 'Guia Emitida', cssClass: 'status-emitted' },
      paid: { label: 'Guia Paga', cssClass: 'status-paid' }
    };
    const currentCfg = statusConfig[status] || statusConfig.pending;

    card.innerHTML = `
      <div class="mei-card-top">
        <div class="mei-card-header">
          <div>
            <h3 class="mei-client-name">${escapeHtml(client.name)}</h3>
            <span class="mei-client-razao">${escapeHtml(client.razao || client.name)}</span>
          </div>
        </div>

        <div class="cnpj-row">
          <span class="cnpj-value">${formattedCnpj}</span>
          <button class="btn-copy-chip" data-action="copy-cnpj" data-cnpj="${client.cnpj}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copiar
          </button>
        </div>

        <div class="status-badge-row">
          <span style="font-size: 11px; color: var(--text-muted);">Status do Mês:</span>
          <button class="status-badge ${currentCfg.cssClass}" data-action="toggle-status" data-cnpj="${client.cnpj}" title="Clique para alternar: Pendente -> Emitida -> Paga">
            <span class="status-dot"></span>
            <span>${currentCfg.label}</span>
          </button>
        </div>

        <!-- Seção de Dados da Guia e NFS-e -->
        <div class="card-guide-pills">
          ${guideData.hasFile ? `
            <button class="guide-chip pdf" data-action="view-pdf" data-cnpj="${client.cnpj}" title="Baixar / Visualizar PDF">
              📎 ${escapeHtml(guideData.fileName || 'Ver PDF')}
            </button>
          ` : ''}

          ${guideData.pix ? `
            <button class="guide-chip pix" data-action="copy-pix" title="Copiar Pix Copia e Cola">
              ⚡ Copiar Pix
            </button>
          ` : ''}

          ${guideData.barcode ? `
            <button class="guide-chip barcode" data-action="copy-barcode" title="Copiar Código de Barras">
              📊 Copiar Cód. Barras
            </button>
          ` : ''}

          ${hasNfse ? `
            <button class="guide-chip nfse" data-action="copy-nfse-pass" title="Copiar senha da NFS-e Nacional">
              🔑 Senha NFS-e
            </button>
            <button class="guide-chip nfse" data-action="open-nfse-portal" title="Abrir Emissor da NFS-e Nacional">
              🧾 NFS-e
            </button>
          ` : ''}

          ${client.nfseService ? `
            <button class="guide-chip" data-action="copy-nfse-service" title="Copiar texto do serviço padrão para a NFS-e">
              📝 Serviço
            </button>
          ` : ''}

          <button class="guide-chip" data-action="open-guide" title="Anexar PDF da Guia ou Colar Pix / Código de Barras">
            ${(guideData.hasFile || guideData.pix || guideData.barcode) ? '✏️ Alterar Guia' : '📎 Anexar Guia / Pix'}
          </button>
        </div>
      </div>

      <div class="card-bottom-actions">
        <button class="btn-emit-pgmei" data-cnpj="${client.cnpj}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
          Emitir no PGMEI
        </button>

        <div class="sub-actions-row">
          <button class="btn-action-sub whatsapp" data-action="whatsapp" title="Enviar dados e guia no WhatsApp">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            WhatsApp
          </button>

          <button class="btn-action-sub" data-action="edit">
            Editar
          </button>
          <button class="btn-action-sub delete" data-action="delete">
            Excluir
          </button>
        </div>
      </div>
    `;

    // Eventos do Card
    card.querySelector('[data-action="copy-cnpj"]').addEventListener('click', () => {
      navigator.clipboard.writeText(client.cnpj).then(() => {
        showToast('✓ CNPJ copiado para a área de transferência!');
      });
    });

    card.querySelector('[data-action="toggle-status"]').addEventListener('click', () => {
      toggleNextStatus(client.cnpj);
    });

    card.querySelector('[data-action="open-guide"]').addEventListener('click', () => {
      openGuideModal(client);
    });

    const btnPix = card.querySelector('[data-action="copy-pix"]');
    if (btnPix) {
      btnPix.addEventListener('click', () => {
        navigator.clipboard.writeText(guideData.pix).then(() => {
          showToast('✓ Código Pix copiado!');
        });
      });
    }

    const btnBarcode = card.querySelector('[data-action="copy-barcode"]');
    if (btnBarcode) {
      btnBarcode.addEventListener('click', () => {
        navigator.clipboard.writeText(guideData.barcode).then(() => {
          showToast('✓ Código de barras copiado!');
        });
      });
    }

    // Copiar Senha NFS-e
    const btnNfsePass = card.querySelector('[data-action="copy-nfse-pass"]');
    if (btnNfsePass) {
      btnNfsePass.addEventListener('click', () => {
        navigator.clipboard.writeText(client.nfsePassword).then(() => {
          showToast('✓ Senha da NFS-e copiada!');
        });
      });
    }

    // Abrir NFS-e
    const btnOpenNfseCard = card.querySelector('[data-action="open-nfse-portal"]');
    if (btnOpenNfseCard) {
      btnOpenNfseCard.addEventListener('click', () => {
        const toCopy = client.nfsePassword || client.cnpj;
        navigator.clipboard.writeText(toCopy).then(() => {
          showToast(client.nfsePassword ? '✓ Senha copiada! Abrindo NFS-e...' : '✓ CNPJ copiado! Abrindo NFS-e...');
          window.open(NFSE_URL, '_blank');
        });
      });
    }

    // Copiar Serviço
    const btnNfseService = card.querySelector('[data-action="copy-nfse-service"]');
    if (btnNfseService) {
      btnNfseService.addEventListener('click', () => {
        navigator.clipboard.writeText(client.nfseService).then(() => {
          showToast('✓ Descrição do serviço copiada!');
        });
      });
    }

    // Ver PDF salvo
    const btnViewPdf = card.querySelector('[data-action="view-pdf"]');
    if (btnViewPdf) {
      btnViewPdf.addEventListener('click', async () => {
        const monthKey = getCurrentMonthKey();
        const fileKey = `${monthKey}_${client.cnpj}`;
        const data = await getFileFromIndexedDB(fileKey);
        if (data && data.blob) {
          viewOrDownloadBlob(data.blob, data.name);
          showToast('✓ Baixando arquivo PDF...');
        } else {
          showToast('Arquivo não encontrado localmente.');
        }
      });
    }

    // Emitir no PGMEI
    card.querySelector('.btn-emit-pgmei').addEventListener('click', () => {
      navigator.clipboard.writeText(client.cnpj).then(() => {
        if (getClientMonthStatus(client.cnpj) === 'pending') {
          setClientMonthStatus(client.cnpj, 'emitted');
        }
        showToast('✓ CNPJ copiado! Abrindo o portal da Receita...');
        window.open(PGMEI_URL, '_blank');
      });
    });

    // WhatsApp Inteligente
    card.querySelector('[data-action="whatsapp"]').addEventListener('click', () => {
      sendWhatsApp(client);
    });

    // Editar Cliente
    card.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openEditModal(client);
    });

    // Excluir
    card.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (confirm(`Deseja realmente excluir o cadastro de "${client.name}"?`)) {
        appData.clients = appData.clients.filter((c) => c.id !== client.id);
        saveStorage();
        updateMetrics();
        renderCards();
        showToast('Cadastro removido com sucesso.');
      }
    });

    clientsContainer.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Consulta BrasilAPI ---
async function fetchBrasilApiCnpj(cnpjClean) {
  if (cnpjClean.length !== 14) return;

  apiStatusText.textContent = 'Consultando Receita Federal (BrasilAPI)...';
  apiStatusText.className = 'form-helper loading';

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjClean}`);
    if (!res.ok) throw new Error('Não encontrado');
    const data = await res.json();

    if (data.razao_social) {
      inputRazao.value = data.razao_social;
      if (!inputName.value) {
        inputName.value = data.nome_fantasia || data.razao_social;
      }
      if (data.ddd_telefone_1 && !inputPhone.value) {
        inputPhone.value = formatPhone(data.ddd_telefone_1);
      }
      apiStatusText.textContent = `✓ Encontrado: ${data.razao_social} (${data.descricao_situacao_cadastral || 'Ativa'})`;
      apiStatusText.className = 'form-helper success';
    }
  } catch (err) {
    apiStatusText.textContent = 'Não foi possível consultar automaticamente. Preencha os dados manualmente.';
    apiStatusText.className = 'form-helper error';
  }
}

// --- Modal de Cadastro / Edição de Cliente ---
window.openAddModal = function () {
  modalClientTitle.textContent = 'Cadastrar Novo MEI';
  formClient.reset();
  clientIdInput.value = '';
  if (inputNfsePassword) inputNfsePassword.value = '';
  if (inputCpf) inputCpf.value = '';
  if (inputNfseService) inputNfseService.value = '';
  apiStatusText.textContent = 'Digite os 14 dígitos para buscar os dados na Receita Federal.';
  apiStatusText.className = 'form-helper';
  modalClient.classList.remove('hidden');
  inputCnpj.focus();
};

function openEditModal(client) {
  modalClientTitle.textContent = 'Editar MEI';
  clientIdInput.value = client.id;
  inputCnpj.value = formatCnpj(client.cnpj);
  inputName.value = client.name || '';
  inputRazao.value = client.razao || '';
  inputPhone.value = formatPhone(client.phone || '');
  inputNotes.value = client.notes || '';
  if (inputNfsePassword) inputNfsePassword.value = client.nfsePassword || '';
  if (inputCpf) inputCpf.value = formatCpf(client.cpf || '');
  if (inputNfseService) inputNfseService.value = client.nfseService || '';
  apiStatusText.textContent = 'Edite as informações e clique em Salvar.';
  apiStatusText.className = 'form-helper';
  modalClient.classList.remove('hidden');
}

function closeModalClient() {
  modalClient.classList.add('hidden');
}

btnOpenAddModal.addEventListener('click', openAddModal);
if (btnHeaderAdd) btnHeaderAdd.addEventListener('click', openAddModal);
fabAdd.addEventListener('click', openAddModal);
btnCloseModalClient.addEventListener('click', closeModalClient);
btnCancelModalClient.addEventListener('click', closeModalClient);

if (btnToggleNfseWebPass && inputNfsePassword) {
  btnToggleNfseWebPass.addEventListener('click', () => {
    if (inputNfsePassword.type === 'password') {
      inputNfsePassword.type = 'text';
      btnToggleNfseWebPass.textContent = '🔒';
    } else {
      inputNfsePassword.type = 'password';
      btnToggleNfseWebPass.textContent = '👁️';
    }
  });
}

inputCnpj.addEventListener('input', (e) => {
  e.target.value = formatCnpj(e.target.value);
  const clean = cleanDigits(e.target.value);
  if (clean.length === 14) {
    fetchBrasilApiCnpj(clean);
  }
});

if (inputCpf) {
  inputCpf.addEventListener('input', (e) => {
    e.target.value = formatCpf(e.target.value);
  });
}

btnBuscarBrasilApi.addEventListener('click', () => {
  const clean = cleanDigits(inputCnpj.value);
  if (clean.length === 14) {
    fetchBrasilApiCnpj(clean);
  } else {
    alert('Informe os 14 dígitos do CNPJ para pesquisar.');
  }
});

inputPhone.addEventListener('input', (e) => {
  e.target.value = formatPhone(e.target.value);
});

formClient.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = clientIdInput.value;
  const cnpjClean = cleanDigits(inputCnpj.value);
  const name = inputName.value.trim();
  const razao = inputRazao.value.trim();
  const phone = cleanDigits(inputPhone.value);
  const notes = inputNotes.value.trim();
  const nfsePassword = inputNfsePassword ? inputNfsePassword.value.trim() : '';
  const cpf = inputCpf ? cleanDigits(inputCpf.value) : '';
  const nfseService = inputNfseService ? inputNfseService.value.trim() : '';

  if (cnpjClean.length !== 14) {
    alert('CNPJ inválido. Precisa ter exatamente 14 dígitos.');
    return;
  }

  if (!name) {
    alert('Por favor, informe o apelido/nome do cliente.');
    return;
  }

  if (id) {
    const index = appData.clients.findIndex((c) => String(c.id) === String(id));
    if (index !== -1) {
      appData.clients[index] = {
        ...appData.clients[index],
        cnpj: cnpjClean,
        name,
        razao: razao || name,
        phone,
        notes,
        nfsePassword,
        cpf,
        nfseService
      };
      showToast('✓ MEI atualizado com sucesso!');
    }
  } else {
    const exists = appData.clients.some((c) => c.cnpj === cnpjClean);
    if (exists && !confirm('Este CNPJ já está cadastrado. Deseja adicionar mesmo assim?')) {
      return;
    }

    appData.clients.unshift({
      id: Date.now(),
      cnpj: cnpjClean,
      name,
      razao: razao || name,
      phone,
      notes,
      nfsePassword,
      cpf,
      nfseService,
      createdAt: new Date().toISOString()
    });
    showToast('✓ MEI cadastrado com sucesso!');
  }

  saveStorage();
  updateMetrics();
  renderCards();
  closeModalClient();
});

// --- Modal de Dados da Guia (PDF, Pix, Código de Barras) ---
function openGuideModal(client) {
  currentGuideClient = client;
  currentGuideTempFile = null;
  isGuideFileRemoved = false;

  const monthName = MONTH_NAMES[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  modalGuideTitle.textContent = `Guia DAS: ${client.name}`;
  modalGuideSubtitle.textContent = `Competência ${monthName} de ${year}`;
  guideClientCnpj.value = client.cnpj;

  const guideData = getClientMonthData(client.cnpj);
  inputGuidePix.value = guideData.pix || '';
  inputGuideBarcode.value = guideData.barcode || '';

  if (guideData.hasFile && guideData.fileName) {
    fileUploadPrompt.classList.add('hidden');
    fileAttachedInfo.classList.remove('hidden');
    attachedFileName.textContent = guideData.fileName;
  } else {
    fileUploadPrompt.classList.remove('hidden');
    fileAttachedInfo.classList.add('hidden');
    attachedFileName.textContent = '';
  }

  modalGuide.classList.remove('hidden');
}

function closeGuideModal() {
  modalGuide.classList.add('hidden');
  currentGuideClient = null;
  currentGuideTempFile = null;
  isGuideFileRemoved = false;
  inputGuideFile.value = '';
}

btnCloseModalGuide.addEventListener('click', closeGuideModal);
btnCancelModalGuide.addEventListener('click', closeGuideModal);

fileUploadBox.addEventListener('click', (e) => {
  if (e.target.closest('.file-attached-actions')) return;
  inputGuideFile.click();
});

inputGuideFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    currentGuideTempFile = file;
    isGuideFileRemoved = false;
    attachedFileName.textContent = file.name;
    fileUploadPrompt.classList.add('hidden');
    fileAttachedInfo.classList.remove('hidden');
  }
});

btnRemoveAttachedFile.addEventListener('click', (e) => {
  e.stopPropagation();
  currentGuideTempFile = null;
  isGuideFileRemoved = true;
  inputGuideFile.value = '';
  fileUploadPrompt.classList.remove('hidden');
  fileAttachedInfo.classList.add('hidden');
});

btnViewAttachedFile.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (currentGuideTempFile) {
    viewOrDownloadBlob(currentGuideTempFile, currentGuideTempFile.name);
  } else if (currentGuideClient) {
    const monthKey = getCurrentMonthKey();
    const fileKey = `${monthKey}_${currentGuideClient.cnpj}`;
    const data = await getFileFromIndexedDB(fileKey);
    if (data && data.blob) {
      viewOrDownloadBlob(data.blob, data.name);
    }
  }
});

btnPastePix.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      inputGuidePix.value = text.trim();
      showToast('✓ Pix colado!');
    }
  } catch (err) {
    inputGuidePix.focus();
    showToast('Dica: Use Ctrl+V ou segure para colar.');
  }
});

btnPasteBarcode.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      inputGuideBarcode.value = text.trim();
      showToast('✓ Código de barras colado!');
    }
  } catch (err) {
    inputGuideBarcode.focus();
    showToast('Dica: Use Ctrl+V ou segure para colar.');
  }
});

async function saveGuideData() {
  if (!currentGuideClient) return false;

  const cnpj = currentGuideClient.cnpj;
  const monthKey = getCurrentMonthKey();
  const fileKey = `${monthKey}_${cnpj}`;

  const pix = inputGuidePix.value.trim();
  const barcode = inputGuideBarcode.value.trim();

  let hasFile = getClientMonthData(cnpj).hasFile;
  let fileName = getClientMonthData(cnpj).fileName;

  if (isGuideFileRemoved) {
    await deleteFileFromIndexedDB(fileKey);
    hasFile = false;
    fileName = '';
  } else if (currentGuideTempFile) {
    await saveFileToIndexedDB(fileKey, currentGuideTempFile, currentGuideTempFile.name, currentGuideTempFile.type);
    hasFile = true;
    fileName = currentGuideTempFile.name;
  }

  updateClientMonthGuideData(cnpj, { pix, barcode, hasFile, fileName });
  showToast('✓ Dados da guia salvos!');
  return true;
}

formGuide.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveGuideData();
  closeGuideModal();
});

btnSaveAndSendGuide.addEventListener('click', async () => {
  const clientToShare = currentGuideClient;
  await saveGuideData();
  closeGuideModal();
  if (clientToShare) {
    sendWhatsApp(clientToShare);
  }
});

// --- Modal de Sincronização / Backup ---
btnOpenSyncModal.addEventListener('click', () => {
  modalSync.classList.remove('hidden');
});
btnCloseModalSync.addEventListener('click', () => {
  modalSync.classList.add('hidden');
});

// Exportar Backup JSON
btnExportJson.addEventListener('click', () => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `facilita-mei-dados-${new Date().toISOString().slice(0, 10)}.json`);
  dlAnchor.click();
  showToast('✓ Backup exportado com sucesso!');
});

// Importar Backup JSON (Compatível com extensão e webapp)
inputImportJson.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const imported = JSON.parse(evt.target.result);

      let importedList = [];
      let importedHistory = {};

      if (Array.isArray(imported)) {
        importedList = imported;
      } else if (imported && typeof imported === 'object') {
        importedList = imported.clients || [];
        importedHistory = imported.history || {};
      }

      let added = 0;
      importedList.forEach((item) => {
        const clean = cleanDigits(item.cnpj);
        if (clean.length === 14 && !appData.clients.some((c) => c.cnpj === clean)) {
          appData.clients.push({
            id: item.id || Date.now() + Math.random(),
            cnpj: clean,
            name: item.name || 'Cliente Importado',
            razao: item.razao || item.name || '',
            phone: cleanDigits(item.phone || ''),
            notes: item.notes || '',
            nfsePassword: item.nfsePassword || '',
            cpf: cleanDigits(item.cpf || ''),
            nfseService: item.nfseService || '',
            createdAt: item.createdAt || new Date().toISOString()
          });
          added++;
        }
      });

      Object.keys(importedHistory).forEach((mKey) => {
        if (!appData.history[mKey]) appData.history[mKey] = {};
        Object.assign(appData.history[mKey], importedHistory[mKey]);
      });

      saveStorage();
      updateMetrics();
      renderCards();
      modalSync.classList.add('hidden');
      showToast(`✓ ${added} MEIs importados com sucesso!`);
    } catch (err) {
      alert('Erro ao importar arquivo: ' + err.message);
    }
    inputImportJson.value = '';
  };
  reader.readAsText(file);
});

// --- Navegação entre Meses ---
btnPrevMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  updateMetrics();
  renderCards();
});

btnNextMonth.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  updateMetrics();
  renderCards();
});

// --- Filtros & Busca ---
filterPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    filterPills.forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.getAttribute('data-filter');
    renderCards();
  });
});

filterSearch.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderCards();
});

// --- Registro do Service Worker para PWA ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then((reg) => console.log('Service Worker registrado:', reg.scope))
      .catch((err) => console.log('Falha ao registrar SW:', err));
  });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  updateMetrics();
  renderCards();
});
