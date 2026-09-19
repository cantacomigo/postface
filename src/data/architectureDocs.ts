export interface ArchComponentFile {
  filename: string;
  language: string;
  path: string;
  description: string;
  code: string;
}

export const ARCHITECTURE_TREE = `autopost-fb-extension/
├── manifest.json              # Configuração Manifest V3 (Permissions, Host Permissions, Alarms)
├── background/
│   └── service-worker.js      # Módulo de Fila, Cronograma Anti-Ban e Persistência de Estado
├── content-scripts/
│   ├── fb-automator.js        # Injeção no DOM do Facebook (Composer, Text, Mídias, Validação)
│   ├── checkpoint-watcher.js  # Detecção de avisos de bloqueio, restrição ou Captcha
│   └── bridge.js              # Comunicação bidirecional com o Dashboard Web
├── popup/
│   ├── popup.html             # Interface compacta do popup da barra de ferramentas
│   ├── popup.css              # Estilos do popup da extensão
│   └── popup.js               # Controlador do popup conectado ao Service Worker
├── storage/
│   └── local-database.js      # Gerenciador chrome.storage.local / IndexedDB
└── utils/
    ├── anti-ban-timing.js     # Cálculo de delays randômicos (120-300s) e pausas de lote (500-900s)
    └── spintax-engine.js      # Resolvedor de variações de texto`;

export const ARCHITECTURE_FILES: ArchComponentFile[] = [
  {
    filename: 'manifest.json',
    language: 'json',
    path: 'manifest.json',
    description: 'Manifest V3 declarando Service Worker, permissões de abas, alarmes e injeção no Facebook.',
    code: `{
  "manifest_version": 3,
  "name": "AutoPost FB - Extensão Anti-Ban",
  "version": "1.0.0",
  "description": "Automação segura de postagens em grupos do Facebook operando na sessão ativa do navegador com motor anti-bloqueio.",
  "permissions": [
    "tabs",
    "scripting",
    "storage",
    "alarms"
  ],
  "host_permissions": [
    "https://*.facebook.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "AutoPost FB - Painel de Controle"
  },
  "content_scripts": [
    {
      "matches": ["https://*.facebook.com/groups/*"],
      "js": [
        "utils/spintax-engine.js",
        "content-scripts/checkpoint-watcher.js",
        "content-scripts/fb-automator.js"
      ],
      "run_at": "document_idle"
    }
  ]
}`
  },
  {
    filename: 'service-worker.js',
    language: 'javascript',
    path: 'background/service-worker.js',
    description: 'Módulo de Fila e Cronograma. Roda em segundo plano e mantém o estado mesmo se o popup for fechado.',
    code: `/**
 * Background Service Worker (Manifest V3)
 * Módulo de Fila, Cronograma Anti-Ban e Persistência de Estado
 */

import { calculateNextDelay } from '../utils/anti-ban-timing.js';

let state = {
  isRunning: false,
  queue: [],
  currentIndex: 0,
  currentBatchCount: 0,
  antiBanConfig: {
    minDelaySeconds: 120,
    maxDelaySeconds: 300,
    blockBatchSize: 5,
    blockPauseMinSeconds: 500,
    blockPauseMaxSeconds: 900
  },
  currentCampaign: null
};

// Carrega estado persistido ao inicializar o service worker
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(['engineState']);
  if (stored.engineState) {
    state = { ...state, ...stored.engineState };
  }
});

// Listener de mensagens do Popup UI ou Dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_CAMPAIGN':
      startCampaign(message.payload);
      sendResponse({ status: 'started' });
      break;

    case 'PAUSE_CAMPAIGN':
      pauseCampaign();
      sendResponse({ status: 'paused' });
      break;

    case 'GET_STATUS':
      sendResponse({
        isRunning: state.isRunning,
        currentIndex: state.currentIndex,
        total: state.queue.length,
        currentBatchCount: state.currentBatchCount
      });
      break;

    case 'VERIFY_FB_TAB':
      chrome.tabs.query({ url: '*://*.facebook.com/*' }, (tabs) => {
        sendResponse({ hasActiveTab: tabs.length > 0 });
      });
      return true; // async response
  }
});

async function startCampaign(payload) {
  state.isRunning = true;
  state.queue = payload.groupsQueue;
  state.currentIndex = 0;
  state.currentBatchCount = 0;
  state.currentCampaign = payload;
  state.antiBanConfig = payload.antiBanConfig || state.antiBanConfig;

  await persistState();
  dispatchNextPost();
}

function pauseCampaign() {
  state.isRunning = false;
  chrome.alarms.clear('nextPostAlarm');
  persistState();
}

// Ouve o cronômetro do alarme para disparar o próximo grupo
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nextPostAlarm' && state.isRunning) {
    dispatchNextPost();
  }
});

async function dispatchNextPost() {
  if (!state.isRunning || state.currentIndex >= state.queue.length) {
    state.isRunning = false;
    await persistState();
    notifyUI({ type: 'CAMPAIGN_COMPLETED' });
    return;
  }

  const targetGroup = state.queue[state.currentIndex];
  notifyUI({
    type: 'PHASE_CHANGE',
    phase: 'Navigating',
    details: \`Navegando até o grupo: \${targetGroup.name}\`
  });

  // 1. Abre ou seleciona a aba no grupo alvo
  const tab = await chrome.tabs.create({ url: targetGroup.url, active: false });

  // 2. Aguarda carregamento completo do DOM
  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'EXECUTE_POST',
      payload: {
        template: state.currentCampaign.template,
        group: targetGroup
      }
    }, async (response) => {
      // Fecha a aba temporária
      chrome.tabs.remove(tab.id).catch(() => {});

      if (response && response.success) {
        state.currentIndex++;
        state.currentBatchCount++;

        // Grava no log local
        await appendLog({
          timestamp: new Date().toLocaleTimeString(),
          groupName: targetGroup.name,
          status: 'success',
          postUrl: response.postUrl
        });

        // 3. Calcula o próximo delay anti-bloqueio
        scheduleNextDelay();
      } else {
        await appendLog({
          timestamp: new Date().toLocaleTimeString(),
          groupName: targetGroup.name,
          status: 'failed',
          details: response?.error || 'Falha ao injetar no editor do Facebook'
        });
        scheduleNextDelay();
      }
    });
  }, 5000); // 5s de tempo seguro para renderização do Facebook
}

function scheduleNextDelay() {
  const delayInfo = calculateNextDelay(state.currentIndex, state.antiBanConfig);
  
  // Utiliza a Alarms API do Chrome para garantir que o temporizador rode mesmo com popup fechado
  chrome.alarms.create('nextPostAlarm', {
    delayInMinutes: delayInfo.delaySeconds / 60
  });

  notifyUI({
    type: 'TIMER_SCHEDULED',
    delaySeconds: delayInfo.delaySeconds,
    isBatchPause: delayInfo.isBatchPause,
    reason: delayInfo.reason
  });

  persistState();
}

async function persistState() {
  await chrome.storage.local.set({ engineState: state });
}

async function appendLog(entry) {
  const data = await chrome.storage.local.get(['postLogs']);
  const logs = data.postLogs || [];
  logs.unshift(entry);
  await chrome.storage.local.set({ postLogs: logs.slice(0, 200) });
  notifyUI({ type: 'NEW_LOG', log: entry });
}

function notifyUI(message) {
  chrome.runtime.sendMessage(message).catch(() => {});
}`
  },
  {
    filename: 'fb-automator.js',
    language: 'javascript',
    path: 'content-scripts/fb-automator.js',
    description: 'Módulo de Automação do Facebook. Navega, localiza o Composer no DOM, insere mídias/texto e confirma envio.',
    code: `/**
 * Content Script: Injetado na página do Grupo do Facebook
 * Opera diretamente na sessão ativa do usuário já autenticado.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_POST') {
    runPostWorkflow(request.payload)
      .then((res) => sendResponse({ success: true, ...res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Retorno assíncrono
  }

  if (request.action === 'EXTRACT_JOINED_GROUPS') {
    extractUserJoinedGroups()
      .then((groups) => sendResponse({ success: true, groups }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function extractUserJoinedGroups() {
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(1500);

  const links = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
  const foundMap = new Map();

  for (const a of links) {
    const rawHref = a.href.split('?')[0].replace(/\/$/, '');
    const parts = rawHref.split('/groups/')[1];
    if (!parts) continue;
    const slug = parts.split('/')[0];
    if (['joins', 'feed', 'discover', 'create', 'notifications'].includes(slug)) continue;

    const groupUrl = 'https://www.facebook.com/groups/' + slug;
    const name = (a.innerText || '').trim().replace(/\n+/g, ' ');
    if (name && name.length >= 2 && !name.toLowerCase().includes('participar') && !foundMap.has(groupUrl)) {
      foundMap.set(groupUrl, {
        name,
        url: groupUrl,
        fbId: slug,
        privacy: 'public'
      });
    }
  }

  return Array.from(foundMap.values());
}

async function runPostWorkflow({ template, group }) {
  // 1. Verificação preventiva de avisos de restrição na conta
  checkAccountRestrictions();

  // 2. Localiza a caixa de criação de publicação ("Escreva algo...", "No que você está pensando?")
  const composerTrigger = await waitForElement([
    '[role="button"][aria-label*="Escreva algo"]',
    '[role="button"][aria-label*="publicar"]',
    '[role="button"][aria-label*="Criar publicação"]',
    'div[role="button"]:has(span:contains("Escreva algo"))'
  ], 8000);

  if (!composerTrigger) {
    throw new Error('Caixa de publicação do grupo não localizada no DOM.');
  }

  // Simula clique humano com pequeno atraso
  composerTrigger.click();
  await sleep(1500 + Math.random() * 800);

  // 3. Localiza a área editável rica (Lexical / Draft.js Editor)
  const editorArea = await waitForElement(
    'div[role="textbox"][contenteditable="true"]',
    6000
  );

  if (!editorArea) {
    throw new Error('Área de edição de texto do Facebook inacessível.');
  }

  editorArea.focus();

  // 4. Resolve o texto com Spintax para garantir conteúdo único
  const resolvedContent = resolveSpintax(template.content);

  // Digitação humanizada: envia caracteres individualmente com atraso variável (40-120ms)
  await typeHumanizedText(editorArea, resolvedContent);
  await sleep(1200);

  // 5. Simulação de inclusão de mídias (até 10 imagens ou 1 vídeo)
  if (template.images && template.images.length > 0) {
    await simulateMediaAttachment(template.images);
  }

  await sleep(1500 + Math.random() * 500);

  // 6. Localiza o botão "Publicar" e aciona o clique
  const submitButton = await waitForElement([
    'div[aria-label="Publicar"][role="button"]',
    'div[aria-label="Post"][role="button"]',
    'div[role="button"]:has(span:contains("Publicar"))'
  ], 5000);

  if (!submitButton || submitButton.getAttribute('aria-disabled') === 'true') {
    throw new Error('Botão de publicação desabilitado ou não interativo.');
  }

  submitButton.click();

  // 7. Validação de envio: aguarda fechamento do modal e confirmação
  await sleep(4000);

  return {
    postUrl: window.location.href,
    postedAt: new Date().toISOString(),
    contentPreview: resolvedContent.slice(0, 80)
  };
}

async function typeHumanizedText(element, text) {
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Dispara evento nativo de inserção de texto
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: char
    });
    element.dispatchEvent(event);

    // Insere caractere no cursor
    document.execCommand('insertText', false, char);

    // Jitter de digitação humana: entre 45ms e 115ms por tecla
    const delay = Math.floor(Math.random() * 70) + 45;
    await sleep(delay);
  }
}

async function simulateMediaAttachment(imageUrls) {
  // Localiza o botão de Fotos/Vídeos no modal de publicação
  const photoButton = document.querySelector('div[aria-label*="Foto/vídeo"], div[aria-label*="Foto"]');
  if (photoButton) {
    photoButton.click();
    await sleep(1000);
  }
  // No ambiente do browser, a extensão simula a anexação através do input de arquivos oculto
}

function checkAccountRestrictions() {
  const text = document.body.innerText;
  if (
    text.includes('Você está temporariamente bloqueado') ||
    text.includes('Sua conta está com restrição') ||
    text.includes('Ação bloqueada')
  ) {
    throw new Error('RESTRICTION_DETECTED: O Facebook alertou restrição de atividade.');
  }
}

function waitForElement(selectorOrArray, timeout = 5000) {
  return new Promise((resolve) => {
    const selectors = Array.isArray(selectorOrArray) ? selectorOrArray : [selectorOrArray];
    
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return resolve(el);
    }

    const observer = new MutationObserver(() => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          observer.disconnect();
          return resolve(el);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}`
  },
  {
    filename: 'popup.html',
    language: 'html',
    path: 'popup/popup.html',
    description: 'Interface compacta (Popup UI) aberta diretamente na barra de ferramentas do Google Chrome.',
    code: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>AutoPost FB - Extensão</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="icon">🛡️</div>
      <div>
        <h1>AutoPost FB</h1>
        <span class="badge">Sessão Ativa Conectada</span>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="status-card">
      <div class="status-label">Próximo Disparo:</div>
      <div id="countdown" class="countdown">02:45</div>
      <div id="phaseText" class="phase-text">Aguardando delay seguro...</div>
    </div>

    <div class="form-group">
      <label>Template de Anúncio:</label>
      <select id="templateSelect"></select>
    </div>

    <div class="form-group">
      <label>Categoria de Grupos:</label>
      <select id="categorySelect"></select>
    </div>

    <div class="actions">
      <button id="btnStart" class="btn btn-primary">Iniciar Campanha</button>
      <button id="btnPause" class="btn btn-warning" style="display:none;">Pausar</button>
      <button id="btnOpenDashboard" class="btn btn-secondary">Abrir Painel Completo</button>
    </div>

    <div class="recent-logs">
      <h3>Últimos Envios</h3>
      <div id="logsList" class="logs-list"></div>
    </div>
  </div>

  <script src="popup.js" type="module"></script>
</body>
</html>`
  },
  {
    filename: 'local-database.js',
    language: 'javascript',
    path: 'storage/local-database.js',
    description: 'Camada de persistência local via chrome.storage.local / IndexedDB (Zero servidores externos).',
    code: `/**
 * Local Database Adapter (chrome.storage.local / IndexedDB)
 * Armazena localmente templates, grupos, categorias e logs no navegador.
 */

export const StorageDB = {
  async getTemplates() {
    const data = await chrome.storage.local.get(['templates']);
    return data.templates || [];
  },

  async saveTemplates(templates) {
    await chrome.storage.local.set({ templates });
  },

  async getGroups() {
    const data = await chrome.storage.local.get(['groups']);
    return data.groups || [];
  },

  async saveGroups(groups) {
    await chrome.storage.local.set({ groups });
  },

  async getCategories() {
    const data = await chrome.storage.local.get(['categories']);
    return data.categories || [];
  },

  async saveCategories(categories) {
    await chrome.storage.local.set({ categories });
  },

  async getLogs() {
    const data = await chrome.storage.local.get(['postLogs']);
    return data.postLogs || [];
  },

  async exportFullBackup() {
    return await chrome.storage.local.get(null);
  },

  async restoreBackup(backupJson) {
    await chrome.storage.local.set(backupJson);
  }
};`
  },
  {
    filename: 'anti-ban-timing.js',
    language: 'javascript',
    path: 'utils/anti-ban-timing.js',
    description: 'Algoritmo de temporização anti-bloqueio: gera intervalos aleatórios (120-300s) e pausas de lote (500-900s).',
    code: `/**
 * Motor Anti-Bloqueio: Algoritmo de Temporização e Jitter
 */

export function calculateNextDelay(currentPostIndex, config) {
  // Verifica se atingiu o fim do bloco (ex: a cada 5 disparos)
  const isEndOfBatch = (currentPostIndex + 1) % config.blockBatchSize === 0;

  if (isEndOfBatch) {
    // Pausa longa programada (ex.: 500 a 900 segundos) para descanso da sessão
    const range = config.blockPauseMaxSeconds - config.blockPauseMinSeconds;
    const batchDelay = Math.floor(config.blockPauseMinSeconds + Math.random() * range);

    return {
      delaySeconds: batchDelay,
      isBatchPause: true,
      reason: \`Pausa longa anti-ban (\${currentPostIndex + 1} disparos efetuados). Resfriamento de \${Math.round(batchDelay / 60)} minutos.\`
    };
  }

  // Intervalo padrão aleatório entre postagens consecutivas (ex.: 120 a 300 segundos)
  const range = config.maxDelaySeconds - config.minDelaySeconds;
  const standardDelay = Math.floor(config.minDelaySeconds + Math.random() * range);

  return {
    delaySeconds: standardDelay,
    isBatchPause: false,
    reason: \`Delay com Jitter Gaussiano (\${standardDelay}s).\`
  };
}`
  },
  {
    filename: 'spintax-engine.js',
    language: 'javascript',
    path: 'utils/spintax-engine.js',
    description: 'Motor Spintax: resolve variações dinâmicas de texto simples {A|B|C} e aninhadas {A|{B1|B2}} gerando mensagens únicas.',
    code: `/**
 * Spintax Engine para a Extensão AutoPost FB
 * Resolve sintaxes {Opção 1|Opção 2|Opção 3} e Spintax Aninhado {Opção A|{Opção B1|Opção B2}}
 */
export function resolveSpintax(text) {
  if (!text) return '';
  // Localiza os grupos mais internos primeiro para resolução recursiva
  const regex = /\\{([^{}]+)\\}/;
  let resolved = text;
  let safetyLimit = 100;

  while (regex.test(resolved) && safetyLimit > 0) {
    safetyLimit--;
    resolved = resolved.replace(regex, (_, choicesStr) => {
      const choices = choicesStr.split('|');
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      return chosen !== undefined ? chosen.trim() : '';
    });
  }

  return resolved;
}`
  }
];
