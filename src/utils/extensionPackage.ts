import JSZip from 'jszip';
import { ARCHITECTURE_FILES } from '../data/architectureDocs';

// Helper to generate real PNG icons inside the zip using HTML5 canvas
function generateIconBase64(size: number): string {
  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw blue gradient background
        const grad = ctx.createLinearGradient(0, 0, size, size);
        grad.addColorStop(0, '#2563eb');
        grad.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(0, 0, size, size, size * 0.22);
        } else {
          ctx.rect(0, 0, size, size);
        }
        ctx.fill();

        // Draw shield / bolt symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(size * 0.52)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FB', size / 2, size / 2);

        const dataUrl = canvas.toDataURL('image/png');
        return dataUrl.split(',')[1];
      }
    }
  } catch (e) {
    console.warn('Canvas icon generation error:', e);
  }
  // Fallback 1x1 valid PNG base64
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // 1. MANIFEST V3
  const MANIFEST_V3_JSON = `{
  "manifest_version": 3,
  "name": "AutoPost FB - Extensão Anti-Ban (Robô Autônomo)",
  "version": "2.4.0",
  "description": "Automação 100% autônoma de postagens em grupos do Facebook operando na sessão ativa do navegador com motor de proteção anti-bloqueio.",
  "permissions": [
    "tabs",
    "scripting",
    "storage",
    "alarms",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.facebook.com/*",
    "http://localhost:3000/*",
    "https://*.run.app/*",
    "https://*.vercel.app/*",
    "*://*/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "AutoPost FB - Painel da Extensão",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["https://*.facebook.com/*"],
      "js": [
        "utils/spintax-engine.js",
        "content-scripts/checkpoint-watcher.js",
        "content-scripts/fb-automator.js"
      ],
      "run_at": "document_idle"
    },
    {
      "matches": ["*://*/*"],
      "js": [
        "content-scripts/bridge.js"
      ],
      "run_at": "document_start"
    }
  ]
}`;

  // 2. BRIDGE CONTENT SCRIPT
  const BRIDGE_JS_CODE = `/**
 * Bridge Content Script: Conecta o Painel Web diretamente à Extensão do Chrome
 */
(function() {
  function announceExtension() {
    window.postMessage({
      source: 'AUTOPPOST_CHROME_EXTENSION',
      type: 'AUTOPPOST_EXTENSION_CONNECTED',
      version: '2.4.0',
      status: 'active',
      timestamp: Date.now()
    }, '*');
  }

  // Notifica imediatamente e mantém heartbeat a cada 3 segundos
  announceExtension();
  setInterval(announceExtension, 3000);

  // Escuta comandos vindos do Painel Web para iniciar ou pausar campanha na extensão
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'AUTOPPOST_WEB_DASHBOARD') return;

    if (event.data.action === 'PING_EXTENSION') {
      announceExtension();
      return;
    }

    // Repassa ação para o Background Service Worker
    chrome.runtime.sendMessage(event.data, (response) => {
      window.postMessage({
        source: 'AUTOPPOST_CHROME_EXTENSION',
        type: 'COMMAND_RESPONSE',
        originalAction: event.data.action,
        response: response || { success: true }
      }, '*');
    });
  });

  // Ouve eventos do Service Worker e transmite para o Painel Web
  chrome.runtime.onMessage.addListener((message) => {
    window.postMessage({
      source: 'AUTOPPOST_CHROME_EXTENSION',
      type: 'BACKGROUND_EVENT',
      payload: message
    }, '*');
  });
})();
`;

  // 3. FB AUTOMATOR CONTENT SCRIPT (DOM Automation on Facebook)
  const FB_AUTOMATOR_CODE = `/**
 * Content Script: Injetado na página do Grupo do Facebook
 * Encontra a caixa de publicação, digita com variação humana e confirma envio.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_POST') {
    runPostWorkflow(request.payload)
      .then((res) => sendResponse({ success: true, ...res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async
  }

  if (request.action === 'EXTRACT_JOINED_GROUPS') {
    extractUserJoinedGroups()
      .then((groups) => sendResponse({ success: true, groups }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function runPostWorkflow({ template, group }) {
  console.log('[AutoPost FB] Iniciando postagem automática no grupo:', group.name);

  // 1. Verificação preventiva de avisos de restrição na conta
  checkAccountRestrictions();

  // 2. Aguarda carregamento inicial da página
  await sleep(2500);

  // 3. Localiza a caixa de criação de publicação
  const composerTrigger = await waitForElement([
    '[role="button"][aria-label*="No que você está pensando"]',
    '[role="button"][aria-label*="Escreva algo"]',
    '[role="button"][aria-label*="Criar publicação"]',
    '[role="button"][aria-label*="Create a public post"]',
    '[role="button"][aria-label*="Write something"]',
    'div[role="feed"] div[role="button"]'
  ], 10000);

  if (!composerTrigger) {
    throw new Error('Caixa de publicação do grupo não localizada no DOM.');
  }

  // Clica no gatilho para abrir o modal de escrita
  composerTrigger.click();
  await sleep(2000);

  // 4. Localiza a área editável rica (Lexical / Draft.js do Facebook)
  const editorArea = await waitForElement([
    'div[role="textbox"][contenteditable="true"]',
    'div[data-lexical-editor="true"]',
    'div[contenteditable="true"]'
  ], 8000);

  if (!editorArea) {
    throw new Error('Área de digitação de texto não acessível no Facebook.');
  }

  editorArea.focus();

  // 5. Resolve Spintax
  let textToPost = template.content;
  if (typeof resolveSpintax === 'function') {
    textToPost = resolveSpintax(template.content);
  }

  // 6. Insere o texto
  await insertTextIntoEditor(editorArea, textToPost);
  await sleep(1500);

  // 7. Localiza o botão "Publicar" ou "Post"
  const submitButton = await waitForElement([
    'div[aria-label="Publicar"][role="button"]',
    'div[aria-label="Post"][role="button"]',
    'div[aria-label="Publicar"]',
    'div[role="button"]:has(span:contains("Publicar"))'
  ], 6000);

  if (!submitButton) {
    throw new Error('Botão "Publicar" não localizado no modal.');
  }

  // Verifica se não está desabilitado
  if (submitButton.getAttribute('aria-disabled') === 'true') {
    throw new Error('Botão de publicação está desabilitado pelo Facebook.');
  }

  // Clica para publicar
  submitButton.click();
  console.log('[AutoPost FB] Botão Publicar acionado com sucesso!');

  // 8. Aguarda 4 segundos para o envio processar
  await sleep(4000);

  return {
    postUrl: window.location.href,
    postedAt: new Date().toISOString(),
    contentPreview: textToPost.slice(0, 100)
  };
}

async function insertTextIntoEditor(element, text) {
  element.focus();
  try {
    // Tenta primeiro método nativo de inserção
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  } catch (e) {
    console.warn('execCommand insertText failed, using fallback event', e);
  }

  // Fallback / complementação com InputEvent
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text
  });
  element.dispatchEvent(event);
}

function checkAccountRestrictions() {
  const bodyText = document.body.innerText || '';
  const checkpointPatterns = [
    'Você está temporariamente bloqueado',
    'Sua conta está com restrição',
    'Ação bloqueada',
    'Restringimos certas atividades',
    'Confirmar sua identidade',
    'Tentativa suspeita de login'
  ];

  for (const pattern of checkpointPatterns) {
    if (bodyText.includes(pattern)) {
      throw new Error('RESTRICTION_DETECTED: O Facebook alertou "' + pattern + '". Pausando campanhas por segurança.');
    }
  }
}

function waitForElement(selectors, timeout = 7000) {
  return new Promise((resolve) => {
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const sel of selectorList) {
      try {
        const el = document.querySelector(sel);
        if (el) return resolve(el);
      } catch (e) {}
    }

    const observer = new MutationObserver(() => {
      for (const sel of selectorList) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            observer.disconnect();
            return resolve(el);
          }
        } catch (e) {}
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
}
`;

  // 4. BACKGROUND SERVICE WORKER (Autonomous Queue Engine)
  const SERVICE_WORKER_CODE = `/**
 * Background Service Worker: Motor de Execução 100% Autônomo
 * Gerencia a fila de postagens em abas em segundo plano sem exigir cliques do usuário.
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

// Inicialização e recuperação de estado
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(['engineState']);
  if (stored.engineState) {
    state = { ...state, ...stored.engineState };
  }
});

// Listener de mensagens do Painel Web e do Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_CAMPAIGN' || message.type === 'START_CAMPAIGN') {
    startCampaign(message.payload);
    sendResponse({ status: 'started', isRunning: true });
    return;
  }

  if (message.action === 'PAUSE_CAMPAIGN' || message.type === 'PAUSE_CAMPAIGN') {
    pauseCampaign();
    sendResponse({ status: 'paused', isRunning: false });
    return;
  }

  if (message.action === 'GET_STATUS' || message.type === 'GET_STATUS') {
    sendResponse({
      isRunning: state.isRunning,
      currentIndex: state.currentIndex,
      total: state.queue.length,
      currentBatchCount: state.currentBatchCount,
      campaign: state.currentCampaign
    });
    return;
  }
});

async function startCampaign(payload) {
  state.isRunning = true;
  state.queue = payload.groupsQueue || [];
  state.currentIndex = 0;
  state.currentBatchCount = 0;
  state.currentCampaign = payload;
  state.antiBanConfig = payload.antiBanConfig || state.antiBanConfig;

  await persistState();
  broadcast({ type: 'CAMPAIGN_STARTED', queueLength: state.queue.length });
  dispatchNextPost();
}

function pauseCampaign() {
  state.isRunning = false;
  chrome.alarms.clear('nextPostAlarm');
  persistState();
  broadcast({ type: 'CAMPAIGN_PAUSED' });
}

// Alarme para o próximo envio
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nextPostAlarm' && state.isRunning) {
    dispatchNextPost();
  }
});

async function dispatchNextPost() {
  if (!state.isRunning || state.currentIndex >= state.queue.length) {
    state.isRunning = false;
    await persistState();
    broadcast({ type: 'CAMPAIGN_COMPLETED' });
    return;
  }

  const targetGroup = state.queue[state.currentIndex];
  broadcast({
    type: 'PHASE_CHANGE',
    phase: 'Posting',
    groupName: targetGroup.name,
    currentIndex: state.currentIndex,
    total: state.queue.length
  });

  try {
    // 1. Cria a aba do grupo em segundo plano (active: false para não atrapalhar o usuário)
    const tab = await chrome.tabs.create({ url: targetGroup.url, active: false });

    // 2. Aguarda 6 segundos para renderização da página
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'EXECUTE_POST',
        payload: {
          template: state.currentCampaign.template,
          group: targetGroup
        }
      }, async (response) => {
        // Fecha a aba temporária de postagem
        chrome.tabs.remove(tab.id).catch(() => {});

        if (response && response.success) {
          state.currentIndex++;
          state.currentBatchCount++;

          const logEntry = {
            timestamp: new Date().toLocaleTimeString(),
            groupName: targetGroup.name,
            status: 'success',
            postUrl: targetGroup.url
          };
          await appendLog(logEntry);
          broadcast({ type: 'POST_SUCCESS', log: logEntry });

          scheduleNextDelay();
        } else {
          const logEntry = {
            timestamp: new Date().toLocaleTimeString(),
            groupName: targetGroup.name,
            status: 'failed',
            details: response?.error || 'Falha ao interagir com o editor do Facebook'
          };
          await appendLog(logEntry);
          broadcast({ type: 'POST_FAILED', log: logEntry });

          scheduleNextDelay();
        }
      });
    }, 6000);
  } catch (err) {
    console.error('[AutoPost FB] Erro ao disparar postagem:', err);
    scheduleNextDelay();
  }
}

function scheduleNextDelay() {
  const delayInfo = calculateNextDelay(state.currentIndex, state.antiBanConfig);

  chrome.alarms.create('nextPostAlarm', {
    delayInMinutes: Math.max(0.1, delayInfo.delaySeconds / 60)
  });

  broadcast({
    type: 'DELAY_SCHEDULED',
    delaySeconds: delayInfo.delaySeconds,
    reason: delayInfo.reason,
    isBatchPause: delayInfo.isBatchPause
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
}

function broadcast(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}
`;

  // 5. SPINTAX ENGINE (Suporta Spintax Simples e Aninhado)
  const SPINTAX_ENGINE_CODE = `/**
 * Spintax Engine para a Extensão AutoPost FB
 * Resolve sintaxes {Opção 1|Opção 2|Opção 3} e Spintax Aninhado {Opção A|{Opção B1|Opção B2}}
 */
export function resolveSpintax(text) {
  if (!text) return '';
  // Localiza chaves mais internas primeiro para resolver recursivamente
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
}
`;

  // 6. CHECKPOINT WATCHER
  const CHECKPOINT_WATCHER_CODE = `/**
 * Checkpoint Watcher para a Extensão AutoPost FB
 * Monitora avisos de restrição ou bloqueio no DOM do Facebook
 */
export function detectFacebookCheckpoint() {
  const bodyText = document.body.innerText || '';
  const checkpointPatterns = [
    'Você está temporariamente bloqueado',
    'Sua conta está com restrição',
    'Ação bloqueada',
    'Restringimos certas atividades',
    'Confirmar sua identidade',
    'Tentativa suspeita de login'
  ];

  for (const pattern of checkpointPatterns) {
    if (bodyText.includes(pattern)) {
      return { isBlocked: true, reason: pattern };
    }
  }
  return { isBlocked: false };
}
`;

  // 7. POPUP JS & CSS
  const POPUP_JS_CODE = `/**
 * Popup Controller para a Extensão AutoPost FB
 */
document.addEventListener('DOMContentLoaded', async () => {
  const countdownEl = document.getElementById('countdown');
  const phaseTextEl = document.getElementById('phaseText');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnOpenDashboard = document.getElementById('btnOpenDashboard');
  const logsList = document.getElementById('logsList');

  // Abre o dashboard web completo
  if (btnOpenDashboard) {
    btnOpenDashboard.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://postface-orcin.vercel.app' });
    });
  }

  // Consulta o status atual do Service Worker
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
      if (response.isRunning) {
        if (btnStart) btnStart.style.display = 'none';
        if (btnPause) btnPause.style.display = 'block';
        if (phaseTextEl) phaseTextEl.innerText = 'Robô 100% autônomo ativo em segundo plano...';
      } else {
        if (btnStart) btnStart.style.display = 'block';
        if (btnPause) btnPause.style.display = 'none';
        if (phaseTextEl) phaseTextEl.innerText = 'Pronto para iniciar a automação.';
      }
    }
  });

  // Ouve eventos do Service Worker
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PHASE_CHANGE') {
      if (phaseTextEl) phaseTextEl.innerText = 'Postando no grupo: ' + msg.groupName;
    }
    if (msg.type === 'DELAY_SCHEDULED') {
      if (phaseTextEl) phaseTextEl.innerText = 'Resfriando: ' + msg.reason;
    }
  });
});
`;

  const POPUP_CSS_CODE = `* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
body { width: 340px; background: #0f172a; color: #f8fafc; padding: 16px; font-size: 13px; }
.header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 14px; }
.logo { display: flex; align-items: center; gap: 10px; }
.icon { font-size: 24px; }
h1 { font-size: 15px; font-weight: 700; color: #fff; }
.badge { font-size: 10px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 9999px; }
.status-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 14px; }
.status-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
.countdown { font-size: 28px; font-weight: 800; font-family: monospace; color: #38bdf8; margin: 4px 0; }
.phase-text { font-size: 11px; color: #cbd5e1; }
.actions { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
.btn { width: 100%; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-warning { background: #d97706; color: #fff; }
.btn-secondary { background: #334155; color: #f8fafc; }
.btn-secondary:hover { background: #475569; }
`;

  // 8. GUIA VISUAL DE INSTALAÇÃO EM HTML
  const GUIA_HTML_CODE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Instalação da Extensão AutoPost FB - Google Chrome</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; line-height: 1.6; }
    .container { max-width: 680px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { font-size: 24px; color: #38bdf8; margin-bottom: 8px; }
    .badge { display: inline-block; background: #059669; color: #fff; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; margin-bottom: 24px; }
    .step { background: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #334155; }
    .step-number { display: inline-block; background: #2563eb; color: white; width: 26px; height: 26px; border-radius: 50%; text-align: center; line-height: 26px; font-weight: bold; font-size: 13px; margin-right: 8px; }
    .step-title { font-size: 16px; font-weight: bold; color: #f1f5f9; display: inline-block; }
    .step-content { margin-top: 10px; font-size: 14px; color: #cbd5e1; }
    code { background: #334155; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    .highlight { color: #34d399; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Instalar Extensão AutoPost FB</h1>
    <span class="badge">Modo 100% Autônomo • Manifest V3</span>
    <p style="color:#94a3b8; font-size:14px; margin-bottom:24px;">
      Siga os 3 passos simples abaixo no seu Google Chrome para ativar a automação completa sem precisar clicar ou colar nada.
    </p>

    <div class="step">
      <span class="step-number">1</span>
      <span class="step-title">Descompacte esta pasta</span>
      <div class="step-content">
        Você já extraiu o arquivo <code>.zip</code> e está lendo este arquivo dentro da pasta. Mantenha os arquivos organizados nesta mesma pasta.
      </div>
    </div>

    <div class="step">
      <span class="step-number">2</span>
      <span class="step-title">Abra as extensões do Google Chrome</span>
      <div class="step-content">
        1. Abra o seu navegador <strong>Google Chrome</strong>.<br>
        2. Na barra de endereços (onde digita sites), digite <code>chrome://extensions</code> e pressione <strong>Enter</strong>.<br>
        3. No canto superior direito da tela, ative a opção: <span class="highlight">[x] Modo do desenvolvedor</span>.
      </div>
    </div>

    <div class="step">
      <span class="step-number">3</span>
      <span class="step-title">Carregue a Extensão</span>
      <div class="step-content">
        1. No canto superior esquerdo, clique no botão <strong>"Carregar sem compactação"</strong>.<br>
        2. Selecione esta pasta descompactada.<br>
        3. <strong>Pronto!</strong> A extensão AutoPost FB aparecerá instalada no Chrome e começará a fazer as postagens de forma 100% autônoma!
      </div>
    </div>
  </div>
</body>
</html>
`;

  // 9. LEIA-ME TEXTO
  const README_TXT = `=====================================================
AutoPost FB - Extensão Anti-Ban v2.4 (Google Chrome)
MODO 100% AUTÔNOMO (ROBÔ SILENCIOSO)
=====================================================

COMO INSTALAR NO SEU GOOGLE CHROME (3 PASSOS RÁPIDOS):

1. DESCOMPACTE ESTE ARQUIVO .ZIP:
   - Clique com o botão direito neste arquivo e escolha "Extrair Tudo".
   - Será criada uma pasta com os arquivos da extensão.

2. ABRA A PÁGINA DE EXTENSÕES DO CHROME:
   - Abra o Google Chrome.
   - Digite na barra de endereços: chrome://extensions e aperte Enter.
   - No canto superior direito, ATIVE a chave: [x] "Modo do desenvolvedor".

3. CARREGUE A EXTENSÃO:
   - No canto superior esquerdo, clique no botão: "Carregar sem compactação".
   - Selecione a pasta descompactada.
   - Pronto! A extensão estará instalada e ativa no seu Chrome.

REQUISITOS IMPORTANTES:
- Mantenha o Facebook logado na sua conta no Google Chrome.
- O robô usará a sua sessão existente para postar de forma 100% segura, com textos Spintax únicos e intervalos anti-bloqueio programados.
=====================================================
`;

  // Montagem do ZIP
  zip.file('manifest.json', MANIFEST_V3_JSON);
  zip.file('background/service-worker.js', SERVICE_WORKER_CODE);
  zip.file('content-scripts/bridge.js', BRIDGE_JS_CODE);
  zip.file('content-scripts/fb-automator.js', FB_AUTOMATOR_CODE);
  zip.file('content-scripts/checkpoint-watcher.js', CHECKPOINT_WATCHER_CODE);
  zip.file('utils/spintax-engine.js', SPINTAX_ENGINE_CODE);
  zip.file('popup/popup.html', ARCHITECTURE_FILES.find(f => f.filename === 'popup.html')?.code || '');
  zip.file('popup/popup.js', POPUP_JS_CODE);
  zip.file('popup/popup.css', POPUP_CSS_CODE);
  zip.file('storage/local-database.js', ARCHITECTURE_FILES.find(f => f.filename === 'local-database.js')?.code || '');
  zip.file('utils/anti-ban-timing.js', ARCHITECTURE_FILES.find(f => f.filename === 'anti-ban-timing.js')?.code || '');
  zip.file('LEIA-ME_COMO_INSTALAR.txt', README_TXT);
  zip.file('como_instalar_passo_a_passo.html', GUIA_HTML_CODE);

  // Generate binary PNG icons
  zip.file('icons/icon16.png', generateIconBase64(16), { base64: true });
  zip.file('icons/icon48.png', generateIconBase64(48), { base64: true });
  zip.file('icons/icon128.png', generateIconBase64(128), { base64: true });

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'autopost-fb-extensao-v2.4.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
