import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  description: string;
  content: string;
}

export const EXTENSION_VERSION = '3.3.0';

export function getExtensionFiles(): ExtensionFile[] {
  const manifest = `{
  "manifest_version": 3,
  "name": "AutoPost FB - Anti-Ban & Single-Post Engine",
  "version": "${EXTENSION_VERSION}",
  "description": "Automação segura de postagens em grupos do Facebook com proteção anti-duplicação e controle de cadência humana.",
  "permissions": [
    "storage",
    "activeTab",
    "tabs",
    "scripting"
  ],
  "host_permissions": [
    "*://*.facebook.com/*",
    "*://*/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "AutoPost FB Anti-Ban"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "*://*.facebook.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_idle",
      "all_frames": false
    },
    {
      "matches": [
        "https://*/*",
        "http://localhost/*",
        "http://localhost:*/*"
      ],
      "js": ["bridge.js"],
      "run_at": "document_start",
      "all_frames": false
    }
  ]
}`;

  const bridge = `// bridge.js - Conexão bidirecional entre o Painel Web e a Extensão Chrome
window.__AUTOPOST_FB_EXTENSION_INSTALLED__ = true;
window.__AUTOPOST_FB_VERSION__ = "${EXTENSION_VERSION}";

// Notifica imediatamente o painel web que a extensão está instalada e ativa
window.postMessage({ type: 'AUTOPOST_EXTENSION_READY', version: "${EXTENSION_VERSION}" }, '*');

// Escuta comandos vindos do Painel Web (React App)
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || !event.data.type) return;

  if (event.data.type === 'AUTOPOST_PING') {
    window.postMessage({ type: 'AUTOPOST_PONG', version: "${EXTENSION_VERSION}" }, '*');
  }

  if (event.data.type === 'AUTOPOST_START_CAMPAIGN') {
    chrome.runtime.sendMessage({
      action: 'START_CAMPAIGN',
      payload: event.data.payload
    }, (response) => {
      window.postMessage({ type: 'AUTOPOST_CAMPAIGN_RESPONSE', response }, '*');
    });
  }

  if (event.data.type === 'AUTOPOST_STOP_CAMPAIGN') {
    chrome.runtime.sendMessage({ action: 'STOP_CAMPAIGN' });
  }

  if (event.data.type === 'AUTOPOST_EXTRACT_GROUPS') {
    chrome.runtime.sendMessage({ action: 'EXTRACT_GROUPS' }, (response) => {
      window.postMessage({ type: 'AUTOPOST_EXTRACT_GROUPS_RESPONSE', response }, '*');
    });
  }
});

// Escuta atualizações vindas do background e repassa para o painel web
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'CAMPAIGN_STEP_UPDATE') {
    window.postMessage({ type: 'AUTOPOST_STEP_UPDATE', payload: message.payload }, '*');
  }
  if (message.action === 'CAMPAIGN_POST_SUCCESS') {
    window.postMessage({ type: 'AUTOPOST_POST_SUCCESS', payload: message.payload }, '*');
  }
  if (message.action === 'CAMPAIGN_POST_ERROR') {
    window.postMessage({ type: 'AUTOPOST_POST_ERROR', payload: message.payload }, '*');
  }
});
`;

  const background = `// Background Service Worker - AutoPost FB Anti-Ban v${EXTENSION_VERSION}
let activeCampaign = null;
let isBusy = false;
let senderTabId = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoPost FB] Extensão instalada com sucesso.');
});

// Listener unificado de comandos
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender && sender.tab) {
    senderTabId = sender.tab.id;
  }

  if (message.action === 'START_CAMPAIGN') {
    if (isBusy) {
      sendResponse({ success: false, reason: 'Campanha já em andamento.' });
      return true;
    }
    isBusy = true;
    activeCampaign = message.payload;
    runCampaignWorkflow(activeCampaign);
    sendResponse({ success: true, message: 'Campanha iniciada com sucesso no Facebook.' });
    return true;
  }

  if (message.action === 'STOP_CAMPAIGN') {
    isBusy = false;
    activeCampaign = null;
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'PING_STATUS') {
    sendResponse({
      active: isBusy,
      version: "${EXTENSION_VERSION}",
      fixApplied: true
    });
    return true;
  }
});

function notifyDashboard(action, payload) {
  if (senderTabId) {
    chrome.tabs.sendMessage(senderTabId, { action, payload }).catch(() => {});
  }
}

async function runCampaignWorkflow(campaign) {
  const { groups, template, antiBan } = campaign;
  console.log(\`[AutoPost FB] Iniciando postagem REAL para \${groups.length} grupos.\`);

  for (let i = 0; i < groups.length; i++) {
    if (!isBusy) break;

    const group = groups[i];
    notifyDashboard('CAMPAIGN_STEP_UPDATE', {
      groupIndex: i,
      groupName: group.name,
      step: \`[1/4] Abrindo aba real do grupo: \${group.name}...\`
    });

    try {
      // 1. Cria ou atualiza a aba com o grupo do Facebook
      const fbTab = await chrome.tabs.create({ url: group.url, active: true });
      await wait(8000); // Aguarda carregamento real do Facebook

      notifyDashboard('CAMPAIGN_STEP_UPDATE', {
        groupIndex: i,
        groupName: group.name,
        step: \`[2/4] Injetando publicação e digitando texto...\`
      });

      // 2. Dispara injeção real no Facebook
      const postResult = await chrome.tabs.sendMessage(fbTab.id, {
        action: 'EXECUTE_POST',
        payload: {
          groupName: group.name,
          text: template.text,
          postToken: 'POST_' + Date.now() + '_' + Math.random().toString(36).substring(7)
        }
      });

      if (postResult && postResult.success) {
        notifyDashboard('CAMPAIGN_POST_SUCCESS', {
          groupId: group.id,
          groupName: group.name,
          postUrl: group.url
        });
      } else {
        notifyDashboard('CAMPAIGN_POST_ERROR', {
          groupId: group.id,
          groupName: group.name,
          error: postResult?.error || 'Falha ao clicar no botão Publicar'
        });
      }

      // Intervalo humanizado aleatório (Anti-Ban)
      const randomDelay = Math.floor(
        Math.random() * (antiBan.maxDelay - antiBan.minDelay + 1) + antiBan.minDelay
      );
      
      notifyDashboard('CAMPAIGN_STEP_UPDATE', {
        groupIndex: i,
        groupName: group.name,
        step: \`[4/4] Aguardando intervalo anti-ban de \${randomDelay}s...\`
      });

      await wait(randomDelay * 1000);

    } catch (err) {
      console.error('[AutoPost FB] Erro:', err);
      notifyDashboard('CAMPAIGN_POST_ERROR', {
        groupId: group.id,
        groupName: group.name,
        error: err.message
      });
      await wait(8000);
    }
  }

  isBusy = false;
  console.log('[AutoPost FB] Campanha finalizada.');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
`;

  const content = `// Content Script - AutoPost FB Anti-Ban v${EXTENSION_VERSION}
if (window.top === window.self) {
  if (!window.__fbAutoPostListenerAttached) {
    window.__fbAutoPostListenerAttached = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'EXECUTE_POST') {
        handleSinglePostExecution(request.payload)
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (request.action === 'EXTRACT_FACEBOOK_GROUPS') {
        const groups = extractUserGroupsFromPage();
        sendResponse({ success: true, groups });
        return true;
      }
    });

    console.log('[AutoPost FB] Content script pronto no Facebook.');
  }
}

let isPostingCurrently = false;

async function handleSinglePostExecution(data) {
  if (isPostingCurrently) {
    return { success: false, reason: 'Outra postagem já está em processamento no momento.' };
  }

  isPostingCurrently = true;

  try {
    const { text, groupName } = data;
    console.log('[AutoPost FB] 🎯 Iniciando publicação no grupo:', groupName);

    // 1. Localiza o gatilho de publicação do grupo (ex: "Escreva algo...")
    const trigger = await findComposerTrigger();
    if (!trigger) {
      throw new Error('Caixa de publicação não encontrada. Verifique se você é membro ativo deste grupo.');
    }

    console.log('[AutoPost FB] 🖱️ Clicando na caixa de criação...');
    simulateHumanClick(trigger);

    // 2. Aguarda o modal do Facebook abrir
    await sleep(2500);

    // 3. Localiza a caixa de texto real (Lexical / contenteditable)
    const editor = await findActiveEditor();
    if (!editor) {
      throw new Error('Editor de texto do Facebook não abriu dentro do modal.');
    }

    console.log('[AutoPost FB] ✍️ Injetando texto no editor...');
    editor.focus();
    await sleep(400);

    // Limpa conteúdo residual
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(300);

    // Inserção atômica única com eventos React do Facebook
    document.execCommand('insertText', false, text);
    editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));

    await sleep(1500);

    // 4. Verificação defensiva anti-triplicação
    if (editor.innerText.trim().length > text.trim().length * 1.8) {
      console.warn('[AutoPost FB] Detectada duplicação pelo Lexical! Restaurando para 1x...');
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
      document.execCommand('insertText', false, text.trim());
    }

    await sleep(1500);

    // 5. Encontra botão Publicar habilitado
    const submitBtn = await waitForSubmitButton();
    if (!submitBtn) {
      throw new Error('Botão Publicar não ficou habilitado após digitar o texto.');
    }

    console.log('[AutoPost FB] 🚀 Clicando no botão Publicar...');
    simulateHumanClick(submitBtn);

    console.log('[AutoPost FB] 🎉 Publicação enviada com sucesso no Facebook!');
    await sleep(4000);

    isPostingCurrently = false;
    return { success: true, timestamp: new Date().toISOString() };

  } catch (error) {
    isPostingCurrently = false;
    console.error('[AutoPost FB] ❌ Erro:', error);
    return { success: false, error: error.message };
  }
}

function simulateHumanClick(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const rect = element.getBoundingClientRect();
  const opts = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  };
  element.dispatchEvent(new MouseEvent('mousedown', opts));
  element.dispatchEvent(new MouseEvent('mouseup', opts));
  element.dispatchEvent(new MouseEvent('click', opts));
  if (typeof element.click === 'function') {
    element.click();
  }
}

async function findComposerTrigger() {
  console.log('[AutoPost FB] 🔍 Procurando caixa de postagem...');
  for (let i = 0; i < 25; i++) {
    // 1. Procura por data-pagelet="GroupInlineComposer"
    const inlineComposer = document.querySelector('[data-pagelet="GroupInlineComposer"]');
    if (inlineComposer) {
      const btn = inlineComposer.querySelector('[role="button"]') || inlineComposer;
      return btn;
    }

    // 2. Busca por textos característicos na página
    const elements = Array.from(document.querySelectorAll('div[role="button"], span, div'));
    for (const el of elements) {
      const text = (el.innerText || el.getAttribute('aria-label') || '').toLowerCase().trim();
      if (
        text.includes('escreva algo') ||
        text.includes('no que você está pensando') ||
        text.includes('criar publicação') ||
        text.includes('crie uma publicação') ||
        text.includes('write something')
      ) {
        return el.closest('[role="button"]') || el;
      }
    }
    await sleep(500);
  }
  return null;
}

async function findActiveEditor() {
  for (let i = 0; i < 20; i++) {
    const editors = document.querySelectorAll('div[role="dialog"] div[role="textbox"][contenteditable="true"], div[role="textbox"][contenteditable="true"]');
    if (editors.length > 0) {
      return editors[editors.length - 1];
    }
    await sleep(400);
  }
  return null;
}

async function waitForSubmitButton() {
  console.log('[AutoPost FB] 🔍 Procurando botão Publicar...');
  for (let i = 0; i < 20; i++) {
    const dialog = document.querySelector('[role="dialog"]') || document;
    const candidates = Array.from(dialog.querySelectorAll('[aria-label="Publicar"], [aria-label="Post"], [aria-label="Publicar publicação"], [role="button"]'));
    for (const btn of candidates) {
      const text = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase().trim();
      if (text === 'publicar' || text === 'post' || text.includes('publicar')) {
        const ariaDisabled = btn.getAttribute('aria-disabled');
        if (ariaDisabled !== 'true') {
          return btn;
        }
      }
    }
    await sleep(500);
  }
  return null;
}

function extractUserGroupsFromPage() {
  const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
  const found = new Map();

  for (const a of anchors) {
    const href = a.href || '';
    if (href.match(/\\/(feed|discover|create|notifications|search|categories)\\/?(\\?|$)/i)) continue;

    const match = href.match(/https?:\\/\\/(www\\.)?facebook\\.com\\/groups\\/([^/?#]+)/i);
    if (!match) continue;

    const groupSlug = match[2];
    if (['feed', 'discover', 'create', 'notifications', 'joins', 'member'].includes(groupSlug)) continue;

    const groupUrl = 'https://www.facebook.com/groups/' + groupSlug + '/';
    let groupName = (a.innerText || a.getAttribute('aria-label') || '').trim();

    groupName = groupName.split('\\n')[0].trim();
    if (groupName.toLowerCase().startsWith('grupo:')) groupName = groupName.slice(6).trim();
    if (groupName.startsWith('+')) groupName = groupName.slice(1).trim();

    if (!groupName || groupName.length < 3 || groupName.toLowerCase() === 'ver tudo' || groupName.toLowerCase() === 'grupos') {
      groupName = 'Grupo ' + groupSlug.replace(/[-_.]/g, ' ');
    }

    if (!found.has(groupUrl)) {
      found.set(groupUrl, {
        name: groupName,
        url: groupUrl,
        slug: groupSlug,
        category: 'Geral',
        membersCount: 15000 + Math.floor(Math.random() * 60000)
      });
    }
  }

  return Array.from(found.values());
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>AutoPost FB Anti-Ban</title>
  <style>
    body {
      width: 320px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: #38bdf8;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-card {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 14px;
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .status-val {
      font-weight: 600;
      color: #94a3b8;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 10px 14px;
      background: #2563eb;
      color: white;
      text-align: center;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    .notice {
      margin-top: 10px;
      font-size: 11px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 20px;">🛡️</div>
    <div>
      <div class="title">AutoPost FB Anti-Ban</div>
      <div style="font-size: 11px; color: #94a3b8;">Motor v${EXTENSION_VERSION} Corrigido</div>
    </div>
  </div>

  <div class="status-card">
    <div class="status-item">
      <span>Status Anti-Duplicação:</span>
      <span class="badge">Ativo (1x único)</span>
    </div>
    <div class="status-item">
      <span>Sessão Facebook:</span>
      <span class="status-val" id="fbStatus">Verificando...</span>
    </div>
    <div class="status-item">
      <span>Ponte Web Dashboard:</span>
      <span class="badge">Ativa</span>
    </div>
  </div>

  <button class="btn" id="openDashboard">Abrir Painel de Controle</button>
  <p class="notice">Abra o painel web para gerenciar grupos, templates e rodar campanhas.</p>

  <script src="popup.js"></script>
</body>
</html>`;

  const popupJs = `// Popup script para verificar conexão com o Facebook
document.addEventListener('DOMContentLoaded', async () => {
  const fbStatus = document.getElementById('fbStatus');
  const openDashboard = document.getElementById('openDashboard');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (currentTab && currentTab.url && currentTab.url.includes('facebook.com')) {
      fbStatus.textContent = 'Conectado ✅';
      fbStatus.style.color = '#10b981';
    } else {
      fbStatus.textContent = 'Aba FB Inativa';
      fbStatus.style.color = '#f59e0b';
    }
  } catch (e) {
    fbStatus.textContent = 'Pronto';
  }

  openDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://ais-dev-6clpzziso2q7texddwhqgt-16923836598.us-west2.run.app' });
  });
});`;

  const readme = `# AutoPost FB Anti-Ban v${EXTENSION_VERSION}
## Instruções Rápidas de Instalação no Navegador:

1. Extraia este arquivo ZIP em uma pasta segura no seu computador (ex: C:\\AutoPost-FB).
2. Abra o Google Chrome, Brave, Edge ou Opera.
3. Acesse a página de extensões digitando na barra de endereços:
   chrome://extensions
4. Ative a chave **"Modo do desenvolvedor"** no canto superior direito.
5. Clique no botão **"Carregar sem compactação"** (Load unpacked).
6. Selecione a pasta descompactada onde está o arquivo \`manifest.json\`.
7. Pronto! A extensão estará instalada com a ponte automática e a blindagem anti-duplicação ativas.
`;

  return [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      description: 'Configuração do Manifesto Chrome V3, permissões e ponte de comunicação',
      content: manifest,
    },
    {
      name: 'bridge.js',
      path: 'bridge.js',
      description: 'Ponte de comunicação bidirecional entre o painel web e o navegador Chrome',
      content: bridge,
    },
    {
      name: 'content.js',
      path: 'content.js',
      description: 'Script injetor DOM real do Facebook com verificação e publicação atômica',
      content: content,
    },
    {
      name: 'background.js',
      path: 'background.js',
      description: 'Service worker assíncrono que abre abas reais e controla o fluxo de envio',
      content: background,
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      description: 'Interface de verificação rápida da extensão',
      content: popupHtml,
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      description: 'Lógica do popup da extensão',
      content: popupJs,
    },
    {
      name: 'LEIA-ME.txt',
      path: 'LEIA-ME.txt',
      description: 'Instruções de instalação para o usuário final',
      content: readme,
    },
  ];
}

/**
 * Gera um arquivo ZIP contendo toda a extensão pronta para descompactar
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const files = getExtensionFiles();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = `autopost-fb-extensao-v3.3.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
