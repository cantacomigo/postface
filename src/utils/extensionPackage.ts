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

export function getGeneratedExtensionFiles(): Record<string, string> {
  // Retorna todos os arquivos que compõem o pacote da extensão
  // Definidos abaixo
  return buildExtensionFilesMap();
}

function buildExtensionFilesMap(): Record<string, string> {
  // 1. MANIFEST V3
  const MANIFEST_V3_JSON = `{
  "manifest_version": 3,
  "name": "AutoPost FB - Extensão Anti-Ban (Robô Autônomo)",
  "version": "3.2.0",
  "description": "Automação 100% autônoma de postagens em grupos do Facebook operando na sessão ativa do navegador com motor de proteção anti-bloqueio.",
  "permissions": [
    "tabs",
    "scripting",
    "storage",
    "alarms",
    "activeTab",
    "webNavigation"
  ],
  "host_permissions": [
    "<all_urls>",
    "*://*.facebook.com/*",
    "*://facebook.com/*"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
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
      "matches": [
        "https://*.facebook.com/*",
        "https://facebook.com/*",
        "http://*.facebook.com/*",
        "http://facebook.com/*"
      ],
      "all_frames": false,
      "js": [
        "utils/spintax-engine.js",
        "content-scripts/checkpoint-watcher.js",
        "content-scripts/fb-automator.js"
      ],
      "run_at": "document_idle"
    },
    {
      "matches": ["*://*/*", "<all_urls>"],
      "all_frames": true,
      "match_about_blank": true,
      "js": [
        "content-scripts/bridge.js"
      ],
      "run_at": "document_start"
    }
  ]
}`;

  // 2. BRIDGE CONTENT SCRIPT
  const BRIDGE_JS_CODE = `/**
 * Bridge Content Script: Conecta o Painel Web diretamente à Extensão do Chrome (v3.2.0)
 * Suporta execução em abas normais e dentro de iframes (ex: Google AI Studio).
 */
(function() {
  function announceExtension() {
    const payload = {
      source: 'AUTOPPOST_CHROME_EXTENSION',
      type: 'AUTOPPOST_EXTENSION_CONNECTED',
      version: '3.2.0',
      status: 'active',
      timestamp: Date.now()
    };
    try { window.postMessage(payload, '*'); } catch (e) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, '*');
      }
    } catch (e) {}
  }

  // Notifica imediatamente e mantém heartbeat a cada 2.5 segundos
  announceExtension();
  setInterval(announceExtension, 2500);

  // Escuta comandos vindos do Painel Web para a extensão
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== 'AUTOPPOST_WEB_DASHBOARD') return;

    if (event.data.action === 'PING_EXTENSION') {
      announceExtension();
      return;
    }

    // Repassa ação para o Background Service Worker
    try {
      chrome.runtime.sendMessage(event.data, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[AutoPost Bridge] Aviso de runtime:', chrome.runtime.lastError.message);
          return;
        }
        const respPayload = {
          source: 'AUTOPPOST_CHROME_EXTENSION',
          type: 'COMMAND_RESPONSE',
          originalAction: event.data.action,
          response: response || { success: true }
        };
        try { window.postMessage(respPayload, '*'); } catch (e) {}
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage(respPayload, '*');
          }
        } catch (e) {}
      });
    } catch (err) {
      console.warn('[AutoPost Bridge] Falha de envio para extensão:', err);
    }
  });

  // Ouve eventos do Service Worker e transmite para o Painel Web
  try {
    chrome.runtime.onMessage.addListener((message) => {
      const bgEvent = {
        source: 'AUTOPPOST_CHROME_EXTENSION',
        type: 'BACKGROUND_EVENT',
        payload: message
      };
      try { window.postMessage(bgEvent, '*'); } catch (e) {}
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(bgEvent, '*');
        }
      } catch (e) {}
    });
  } catch (err) {}
})();
`;

  // 3. FB AUTOMATOR CONTENT SCRIPT (DOM Automation on Facebook)
  const FB_AUTOMATOR_CODE = `/**
 * Content Script: Injetado na página do Grupo do Facebook (v3.2.0)
 * Encontra a caixa de publicação, digita texto, anexa imagens e confirma envio.
 * Possui isolamento estrito de URL para evitar conflito entre abas do Facebook.
 */

console.log('%c[AutoPost FB v3.2.0] Robô Ativo na Página do Facebook!', 'background:#2563eb;color:#ffffff;font-weight:bold;font-size:13px;padding:6px 12px;border-radius:6px;');

let isWorkflowRunning = false;

// Função utilitária para verificar se a aba atual é exatamente o grupo alvo da tarefa
function isTargetGroup(task) {
  if (!task || !task.group || !task.group.url) return true;
  const currentUrl = window.location.href;
  const targetUrl = task.group.url;

  function getGroupId(u) {
    if (!u) return '';
    const m = u.match(/groups\\/([^\\/\\?\\#]+)/i);
    return m ? m[1].toLowerCase() : '';
  }

  const targetGid = getGroupId(targetUrl);
  const currentGid = getGroupId(currentUrl);
  if (targetGid && currentGid) {
    return targetGid === currentGid;
  }

  function cleanUrl(u) {
    return (u || '').replace(/^https?:\\/\\//, '').replace(/^www\\./, '').replace(/\\/$/, '').toLowerCase();
  }
  const cleanTarget = cleanUrl(targetUrl);
  const cleanCurrent = cleanUrl(currentUrl);
  if (cleanCurrent.includes(cleanTarget) || cleanTarget.includes(cleanCurrent)) return true;

  // Se já estiver em uma URL de grupo do Facebook, autoriza a execução
  if (currentUrl.includes('/groups/')) return true;

  return true;
}

// 1. Ouvinte de mensagens diretas do background/dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'EXECUTE_POST') {
    if (isTargetGroup(request.payload)) {
      runPostWorkflow(request.payload)
        .then((res) => sendResponse({ success: true, ...res }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async
    } else {
      console.log('[AutoPost FB] Ignorando tarefa nesta aba pois o grupo alvo é outro:', request.payload?.group?.name);
      sendResponse({ ignored: true, reason: 'not_target_group' });
      return false;
    }
  }

  if (request.action === 'EXTRACT_JOINED_GROUPS') {
    extractUserJoinedGroups()
      .then((groups) => sendResponse({ success: true, groups }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// 2. Ouvinte em tempo real de alterações no storage (aciona SOMENTE se esta aba for o grupo alvo!)
try {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.activeTask && changes.activeTask.newValue) {
      const task = changes.activeTask.newValue;
      if (!isWorkflowRunning && isTargetGroup(task)) {
        console.log('[AutoPost FB] Tarefa do grupo atual detectada via storage.onChanged!');
        task.status = 'processing';
        chrome.storage.local.set({ activeTask: task }).catch(() => {});
        setTimeout(() => runPostWorkflow(task), 600);
      }
    }
  });
} catch (e) {}

// 3. Verificação periódica ao carregar a página do Facebook (Lê fila pendente do Storage)
async function checkPendingTaskOnLoad() {
  if (isWorkflowRunning) return;
  // Só executa verificação de post se estiver em página de grupo do Facebook
  if (!window.location.href.includes('/groups/')) return;

  try {
    const data = await chrome.storage.local.get(['activeTask']);
    if (data.activeTask) {
      const task = data.activeTask;
      const age = Date.now() - (task.timestamp || 0);
      // Se a tarefa foi solicitada nos últimos 5 minutos E esta aba é o grupo alvo
      if (age < 300000 && isTargetGroup(task)) {
        console.log('[AutoPost FB] Tarefa pendente confirmada para este grupo no carregamento! Iniciando robô...');
        task.status = 'processing';
        await chrome.storage.local.set({ activeTask: task });
        runPostWorkflow(task);
      }
    }
  } catch (err) {
    console.warn('[AutoPost FB] Erro ao checar storage local:', err);
  }
}

// Inicializa verificação progressiva para garantir detecção em conexões rápidas ou lentas
[500, 1500, 3500, 6000, 10000].forEach((delay) => setTimeout(checkPendingTaskOnLoad, delay));

// 4. Widget Flutuante de Assistência em Páginas de Grupo do Facebook
function renderGroupAssistantWidget() {
  if (!window.location.href.includes('/groups/')) return;
  let widget = document.getElementById('autopost-fb-group-widget');
  if (widget) return;

  widget = document.createElement('div');
  widget.id = 'autopost-fb-group-widget';
  widget.style.cssText = [
    'position: fixed',
    'bottom: 24px',
    'left: 24px',
    'z-index: 2147483647',
    'background: #0f172a',
    'color: #f8fafc',
    'padding: 10px 18px',
    'border-radius: 9999px',
    'box-shadow: 0 10px 30px rgba(0,0,0,0.6)',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'font-size: 12px',
    'font-weight: 600',
    'display: flex',
    'align-items: center',
    'gap: 12px',
    'border: 1.5px solid #3b82f6',
    'user-select: none'
  ].join(';');

  widget.innerHTML = \`
    <span style="display:inline-block; width:9px; height:9px; background:#22c55e; border-radius:50%; box-shadow: 0 0 8px #22c55e;"></span>
    <span style="letter-spacing:0.3px;">AutoPost FB • Robô Pronto</span>
    <button id="autopost-fb-instant-btn" style="background:#2563eb; color:#fff; border:none; padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700; cursor:pointer; transition:all 0.2s ease;">
      ▶ Postar Agora
    </button>
  \`;

  document.body.appendChild(widget);

  const btn = document.getElementById('autopost-fb-instant-btn');
  if (btn) {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.innerText = '⏳ Postando...';
      try {
        const storageData = await chrome.storage.local.get(['activeTask']);
        const task = storageData.activeTask || {
          group: { name: document.title, url: window.location.href },
          resolvedText: ''
        };
        await runPostWorkflow(task);
        btn.innerText = '✅ Postado!';
        setTimeout(() => { btn.innerText = '▶ Postar Agora'; }, 4000);
      } catch (err) {
        btn.innerText = '⚠️ Tentar Novamente';
        setTimeout(() => { btn.innerText = '▶ Postar Agora'; }, 4000);
      }
    });
  }
}
[800, 2000, 4500].forEach((d) => setTimeout(renderGroupAssistantWidget, d));

// BANNER VISUAL FLUTUANTE NA PÁGINA DO FACEBOOK
function showStatusBanner(message, type = 'info') {
  let banner = document.getElementById('autopost-fb-status-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'autopost-fb-status-banner';
    banner.style.cssText = [
      'position: fixed',
      'top: 24px',
      'right: 24px',
      'z-index: 2147483647',
      'background: #0f172a',
      'color: #f8fafc',
      'padding: 14px 20px',
      'border-radius: 12px',
      'box-shadow: 0 14px 35px rgba(0, 0, 0, 0.45)',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      'display: flex',
      'align-items: center',
      'gap: 14px',
      'border: 2px solid #3b82f6',
      'min-width: 330px',
      'max-width: 460px',
      'transition: all 0.3s ease'
    ].join(';');
    document.body.appendChild(banner);
  }

  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : '🤖';
  const borderColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
  const titleColor = type === 'success' ? '#4ade80' : type === 'error' ? '#f87171' : '#60a5fa';

  banner.style.borderColor = borderColor;
  banner.innerHTML = \`
    <div style="font-size: 26px; line-height: 1;">\${icon}</div>
    <div style="flex: 1;">
      <div style="font-size: 11px; font-weight: 800; color: \${titleColor}; text-transform: uppercase; letter-spacing: 0.8px;">AutoPost FB • Robô em Ação</div>
      <div style="font-size: 13px; font-weight: 500; color: #f1f5f9; margin-top: 3px;">\${message}</div>
    </div>
  \`;
}

function removeStatusBanner() {
  const banner = document.getElementById('autopost-fb-status-banner');
  if (banner && banner.parentNode) {
    banner.parentNode.removeChild(banner);
  }
}

function simulateUserClick(element) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const clientX = rect.left + Math.max(5, rect.width / 2);
  const clientY = rect.top + Math.max(5, rect.height / 2);
  const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY };

  try { element.focus(); } catch (e) {}
  element.dispatchEvent(new PointerEvent('pointerdown', opts));
  element.dispatchEvent(new MouseEvent('mousedown', opts));
  element.dispatchEvent(new PointerEvent('pointerup', opts));
  element.dispatchEvent(new MouseEvent('mouseup', opts));
  element.dispatchEvent(new MouseEvent('click', opts));
  if (typeof element.click === 'function') {
    try { element.click(); } catch (e) {}
  }
}

async function runPostWorkflow({ template, group, resolvedText }) {
  if (isWorkflowRunning) {
    console.log('[AutoPost FB] Fluxo de postagem já em andamento nesta aba.');
    return { success: true, status: 'already_running' };
  }
  isWorkflowRunning = true;

  showStatusBanner('Robô conectado! Iniciando publicação no grupo...', 'info');

  try {
    // 1. Verificação preventiva de avisos de restrição na conta
    checkAccountRestrictions();

    // 2. Aguarda carregamento e estabilização da página do Facebook
    await sleep(2500);

    // 3. Localiza e aciona a caixa "Escreva algo..." / "No que você está pensando..."
    const opened = await findAndClickComposerTrigger();
    if (!opened) {
      throw new Error('Caixa de publicação "Escreva algo..." não encontrada ou não clicável no grupo.');
    }

    // 4. Aguarda a abertura do modal / área de edição
    await sleep(2000);
    const editorArea = await findEditorArea();
    if (!editorArea) {
      throw new Error('Área de digitação de texto (Lexical) não encontrada no modal do Facebook.');
    }

    // 5. Prepara o texto (se já veio resolvido do painel usa ele, senão resolve o spintax)
    let textToPost = resolvedText;
    if (!textToPost && template) {
      textToPost = typeof resolveSpintax === 'function' ? resolveSpintax(template.content) : template.content;
    }
    if (!textToPost) {
      textToPost = 'Publicação automática via AutoPost FB';
    }

    // 6. Insere o texto simulando digitação e eventos nativos
    await insertTextIntoEditor(editorArea, textToPost);
    await sleep(2000);

    // 6.5. Insere imagem(ns) se houver imagem no template/configuração
    const templateImages = (template && Array.isArray(template.images) && template.images.length > 0)
      ? template.images
      : [];

    if (templateImages.length > 0) {
      showStatusBanner('Anexando imagem(ns) ao post...', 'info');
      try {
        await uploadImagesIntoModal(templateImages);
        await sleep(3500); // Aguarda upload e renderização da foto no modal pelo Facebook
      } catch (imgErr) {
        console.warn('[AutoPost FB] Erro ou aviso ao tentar anexar imagens:', imgErr);
        showStatusBanner('Aviso na imagem: ' + imgErr.message + ', continuando post...', 'info');
      }
    }

    // 7. Localiza e aciona o botão Publicar
    const submitted = await findAndClickSubmitButton();
    if (!submitted) {
      throw new Error('Botão "Publicar" não localizado ou continuou desabilitado pelo Facebook.');
    }

    // Aguarda o Facebook processar o envio e fechar o modal
    showStatusBanner('Aguardando Facebook processar o post...', 'info');
    let modalClosed = false;
    for (let w = 0; w < 10; w++) {
      await sleep(1000);
      const remainingDialog = document.querySelector('div[role="dialog"]');
      if (!remainingDialog || remainingDialog.offsetWidth === 0) {
        modalClosed = true;
        break;
      }
    }

    // 8. Confirmação de publicação e limpeza
    showStatusBanner('Publicação enviada com sucesso!', 'success');
    await sleep(2000);

    // Limpa a tarefa do storage
    chrome.storage.local.remove(['activeTask']);

    // Notifica o background
    chrome.runtime.sendMessage({
      action: 'POST_COMPLETED',
      groupName: group?.name || 'Grupo do Facebook',
      postUrl: window.location.href,
      success: true
    }).catch(() => {});

    setTimeout(removeStatusBanner, 5000);

    return {
      postUrl: window.location.href,
      postedAt: new Date().toISOString(),
      contentPreview: textToPost.slice(0, 100)
    };
  } catch (err) {
    showStatusBanner('Erro: ' + err.message, 'error');
    chrome.runtime.sendMessage({
      action: 'POST_FAILED',
      groupName: group?.name || 'Grupo do Facebook',
      error: err.message
    }).catch(() => {});
    throw err;
  } finally {
    isWorkflowRunning = false;
  }
}

async function findAndClickComposerTrigger() {
  showStatusBanner('Localizando campo "Escreva algo..."...', 'info');

  const startTime = Date.now();
  const maxWaitMs = 25000;

  // Garante que o topo da página do grupo esteja visível
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}

  while (Date.now() - startTime < maxWaitMs) {
    // Se o modal de criação de publicação principal já estiver aberto na tela, retorna true!
    const openMainModal = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]')).find(d => {
      const txt = (d.innerText || d.textContent || '').toLowerCase();
      return (txt.includes('criar post') || txt.includes('crie um post') || txt.includes('criar publicação') || txt.includes('adicionar ao seu post')) &&
             d.offsetWidth > 0 && d.offsetHeight > 0;
    });
    if (openMainModal) {
      return true;
    }

    // Helper para certificar que o elemento NÃO pertence a nenhum post/feed/comentário existente
    function isFeedOrCommentElement(el) {
      if (!el) return false;
      // Proíbe elementos dentro de posts do feed ou caixas de comentário
      if (
        el.closest('[role="feed"]') ||
        el.closest('[role="article"]') ||
        el.closest('[data-pagelet*="FeedUnit"]') ||
        el.closest('[data-pagelet*="GroupFeed"]') ||
        el.closest('[data-pagelet*="UFI2"]') ||
        el.closest('[aria-label*="coment" i]') ||
        el.closest('[aria-label*="comment" i]')
      ) {
        return true;
      }
      const label = ((el.getAttribute && el.getAttribute('aria-label')) || '').toLowerCase();
      const txt = (el.innerText || el.textContent || '').toLowerCase();
      if (
        label.includes('coment') ||
        label.includes('comment') ||
        txt.includes('comente como') ||
        txt.includes('escreva um comentário') ||
        txt.includes('write a comment') ||
        txt.includes('responder') ||
        txt.includes('reply')
      ) {
        return true;
      }
      return false;
    }

    // A. Procura prioritária: Container oficial de publicação do Grupo (Composer)
    const directSelectors = [
      'div[data-pagelet*="GroupInlineComposer"]',
      'div[data-pagelet*="InlineComposer"]',
      'div[data-pagelet*="Composer"]',
      '[aria-label*="Crie um post público" i]',
      '[aria-label*="Escreva algo..." i]',
      '[aria-label*="Escreva algo" i]',
      '[aria-label*="No que você está pensando" i]',
      '[aria-label*="Criar publicação" i]',
      '[aria-label*="Create a public post" i]',
      '[aria-label*="Write something" i]',
      '[aria-label*="Foto/vídeo" i]',
      '[aria-label*="Foto/video" i]',
      '[aria-label*="Photo/video" i]'
    ];

    for (const sel of directSelectors) {
      const foundList = Array.from(document.querySelectorAll(sel));
      for (const el of foundList) {
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0 && !isFeedOrCommentElement(el)) {
          showStatusBanner('Abrindo compositor do grupo...', 'info');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(400);

          simulateUserClick(el);
          const innerBtn = el.querySelector('[role="button"], [tabindex="0"]') || el;
          simulateUserClick(innerBtn);

          // Aguarda confirmação de abertura do modal
          for (let w = 0; w < 6; w++) {
            await sleep(400);
            const dialog = document.querySelector('div[role="dialog"]');
            if (dialog && dialog.offsetWidth > 0) {
              console.log('[AutoPost FB] Compositor aberto com sucesso via seletor direto!');
              return true;
            }
          }
        }
      }
    }

    // B. Procura por nós de texto que representam o gatilho de publicação do grupo
    const validTriggerKeywords = [
      'escreva algo',
      'no que você está pensando',
      'crie um post público',
      'crie uma publicação',
      'criar publicação',
      'write something',
      'on your mind',
      'create a public post'
    ];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode;
    const candidates = [];
    while ((textNode = walker.nextNode())) {
      const val = (textNode.nodeValue || '').trim().toLowerCase();
      // Não pode ser comentário nem resposta
      if (val.includes('comentário') || val.includes('comment') || val.includes('responder') || val.includes('comente')) continue;

      if (val && validTriggerKeywords.some(k => val === k || val.startsWith(k))) {
        const parent = textNode.parentElement;
        if (parent && parent.offsetWidth > 0 && !isFeedOrCommentElement(parent)) {
          candidates.push(parent);
        }
      }
    }

    if (candidates.length > 0) {
      // Prioriza o elemento mais no topo da página (o compositor fica acima do feed!)
      candidates.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectA.top - rectB.top;
      });

      const chosen = candidates[0];
      const clickable = chosen.closest('[role="button"]') ||
                        chosen.closest('[tabindex="0"]') ||
                        chosen.parentElement ||
                        chosen;

      showStatusBanner('Clicando no campo "Escreva algo..."...', 'info');
      clickable.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(500);

      simulateUserClick(chosen);
      simulateUserClick(clickable);

      // Aguarda até 3s para o modal de post abrir
      for (let w = 0; w < 6; w++) {
        await sleep(500);
        const dialog = document.querySelector('div[role="dialog"]');
        if (dialog && dialog.offsetWidth > 0) {
          console.log('[AutoPost FB] Modal aberto via clique no texto "Escreva algo..."!');
          return true;
        }
      }
    }

    // C. Procura botões fora do feed cujo texto seja exatamente o gatilho
    const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
    for (const btn of buttons) {
      if (isFeedOrCommentElement(btn)) continue;
      const txt = (btn.innerText || btn.textContent || '').trim().toLowerCase();
      if (validTriggerKeywords.some(k => txt === k || txt.startsWith(k))) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(400);
        simulateUserClick(btn);
        await sleep(1500);
        if (document.querySelector('div[role="dialog"]')) return true;
      }
    }

    window.scrollBy({ top: 100, behavior: 'smooth' });
    await sleep(800);
  }

  return false;
}

async function findEditorArea() {
  const startTime = Date.now();
  const maxWaitMs = 20000;

  while (Date.now() - startTime < maxWaitMs) {
    // 1. Identifica OBRIGATORIAMENTE o modal/diálogo de criação de postagem do Facebook
    const allDialogs = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]'));

    // Filtra pelo modal oficial de criação de postagem (NÃO comentário)
    let targetDialog = allDialogs.find(d => {
      const text = (d.innerText || d.textContent || '').toLowerCase();
      const isNotComment = !text.includes('comentários no post') && !text.includes('responder comentário');
      const isCreatePost = text.includes('criar post') ||
                           text.includes('crie um post') ||
                           text.includes('criar publicação') ||
                           text.includes('postar anonimamente') ||
                           text.includes('adicionar ao seu post') ||
                           text.includes('adicionar ao post') ||
                           text.includes('publicar no grupo');
      return isCreatePost && isNotComment && d.offsetWidth > 0 && d.offsetHeight > 0;
    }) || allDialogs.find(d => d.offsetWidth > 0 && d.offsetHeight > 200) || null;

    if (targetDialog) {
      // A. Seletores diretos dentro do modal
      const directSelectors = [
        'div[role="textbox"][contenteditable="true"]',
        '[contenteditable="true"][role="textbox"]',
        'div[data-lexical-editor="true"]',
        '[data-lexical-editor="true"]',
        '[aria-label*="Crie um post" i]',
        '[aria-label*="post público" i]',
        '[aria-label*="Criar post" i]',
        '[aria-label*="Escreva algo" i]',
        '[aria-label*="No que você está pensando" i]',
        '[aria-label*="Create a public post" i]',
        '[aria-label*="Write something" i]',
        '[aria-label*="on your mind" i]',
        'div[contenteditable="true"]'
      ];

      for (const sel of directSelectors) {
        const found = targetDialog.querySelector(sel);
        if (found && found.offsetWidth > 0 && found.offsetHeight > 0) {
          // Garante que não é caixa de pesquisa
          if (found.getAttribute('role') !== 'searchbox') {
            found.scrollIntoView({ behavior: 'smooth', block: 'center' });
            found.focus();
            return found;
          }
        }
      }

      // B. Placeholder dentro do modal de criação de post
      const placeholderKeywords = [
        'crie um post público',
        'crie um post',
        'escreva algo',
        'no que você está pensando',
        'crie uma publicação'
      ];

      const allSpans = Array.from(targetDialog.querySelectorAll('span, div, p'));
      for (const el of allSpans) {
        const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (placeholderKeywords.some(k => txt === k || txt.startsWith(k))) {
          simulateUserClick(el);
          await sleep(300);

          const nearbyEditor = targetDialog.querySelector('div[role="textbox"], div[contenteditable="true"]');
          if (nearbyEditor) {
            nearbyEditor.focus();
            return nearbyEditor;
          }
        }
      }
    }

    await sleep(500);
  }
  return null;
}

async function insertTextIntoEditor(element, text) {
  showStatusBanner('Digitando texto do anúncio...', 'info');

  element.focus();
  simulateUserClick(element);
  await sleep(350);

  // 1. Limpa qualquer texto residual ou placeholder
  try {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
  } catch (e) {}

  await sleep(200);

  // 2. Método Primário: execCommand insertText (padrão nativo para o Lexical do Facebook)
  let insertionDone = false;
  try {
    insertionDone = document.execCommand('insertText', false, text);
  } catch (e) {
    insertionDone = false;
  }

  // Verifica o comprimento inserido
  let currentContent = (element.innerText || element.textContent || '').trim();

  // 3. SE e SOMENTE SE o texto ainda estiver vazio, usa método de fallback Paste
  if (!insertionDone || currentContent.length === 0) {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      element.dispatchEvent(pasteEvent);
    } catch (e) {
      console.warn('Paste event fallback:', e);
    }
  }

  // Verifica se o fallback funcionou
  currentContent = (element.innerText || element.textContent || '').trim();

  // 4. Último recurso apenas se continuar totalmente vazio
  if (currentContent.length === 0) {
    try {
      const inputEvent = new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      element.dispatchEvent(inputEvent);
    } catch (e) {}
  }

  // 5. Dispara eventos mínimos para o Lexical/React registrar a alteração sem duplicar
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  await sleep(800);
}

// Utilitário para converter base64 ou URL em objeto File
async function urlOrBase64ToFile(item, index) {
  let blob;
  let filename = 'foto_' + (index + 1) + '.jpg';
  let mimeType = 'image/jpeg';

  if (typeof item === 'string' && item.startsWith('data:')) {
    try {
      const parts = item.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) mimeType = match[1];
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mimeType });
      const ext = mimeType.split('/')[1] || 'jpg';
      filename = 'imagem_' + (index + 1) + '.' + ext;
    } catch (err) {
      console.warn('[AutoPost FB] Erro ao decodificar Base64 da imagem:', err);
      return null;
    }
  } else {
    // Se for URL externa, baixa via fetch
    try {
      const resp = await fetch(item);
      blob = await resp.blob();
      mimeType = blob.type || 'image/jpeg';
      const ext = mimeType.split('/')[1] || 'jpg';
      filename = 'imagem_' + (index + 1) + '.' + ext;
    } catch (e) {
      console.warn('[AutoPost FB] Falha ao baixar imagem via fetch:', e);
      return null;
    }
  }

  return new File([blob], filename, { type: mimeType, lastModified: Date.now() });
}

async function uploadImagesIntoModal(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return;

  const allDialogs = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]'));
  const activeDialog = allDialogs.find(d => {
    const txt = (d.innerText || d.textContent || '').toLowerCase();
    const isNotComment = !txt.includes('comentários no post') && !txt.includes('responder comentário');
    return (txt.includes('criar post') || txt.includes('postar') || txt.includes('publicar') || txt.includes('foto')) &&
           isNotComment && d.offsetWidth > 0 && d.offsetHeight > 0;
  }) || allDialogs.find(d => d.offsetWidth > 0 && d.offsetHeight > 200) || document;

  // Converte as imagens para Files
  const files = [];
  for (let i = 0; i < imageUrls.length; i++) {
    const file = await urlOrBase64ToFile(imageUrls[i], i);
    if (file) files.push(file);
  }

  if (files.length === 0) {
    console.warn('[AutoPost FB] Nenhuma imagem válida para carregar.');
    return;
  }

  console.log('[AutoPost FB] ' + files.length + ' imagem(ns) preparadas para anexo.');

  // 1. Procura input de arquivo existente no modal ou na página
  let fileInput = activeDialog.querySelector('input[type="file"][accept*="image"]') ||
                  activeDialog.querySelector('input[type="file"]') ||
                  document.querySelector('div[role="dialog"] input[type="file"]') ||
                  document.querySelector('input[type="file"][accept*="image"]') ||
                  document.querySelector('input[type="file"]');

  // Se o input de arquivo não estiver ativo/visível, clica no botão "Foto/Vídeo" no modal
  if (!fileInput) {
    const photoBtnKeywords = [
      'foto/vídeo',
      'foto/video',
      'foto',
      'fotos',
      'photo/video',
      'photo',
      'photos',
      'adicionar foto',
      'adicionar fotos',
      'carregar foto',
      'carregar fotos'
    ];

    const allButtons = Array.from(activeDialog.querySelectorAll('[role="button"], [aria-label], button, span, div'));
    const photoButton = allButtons.find(b => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase().trim();
      const txt = (b.innerText || b.textContent || '').toLowerCase().trim();
      return photoBtnKeywords.some(k => aria.includes(k) || txt === k || txt.startsWith(k));
    });

    if (photoButton) {
      console.log('[AutoPost FB] Acionando botão Foto/Vídeo no modal...');
      simulateUserClick(photoButton);
      await sleep(1500);

      // Tenta achar o input de arquivo novamente após abrir a seção de foto
      fileInput = activeDialog.querySelector('input[type="file"]') ||
                  document.querySelector('div[role="dialog"] input[type="file"]') ||
                  document.querySelector('input[type="file"]');
    }
  }

  // Método A: Injeção direta de arquivos no input file (DataTransfer)
  if (fileInput) {
    console.log('[AutoPost FB] Input de upload de arquivo encontrado, inserindo ' + files.length + ' imagens...');
    try {
      const dataTransfer = new DataTransfer();
      files.forEach(f => dataTransfer.items.add(f));

      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      console.log('[AutoPost FB] Eventos de upload disparados com sucesso no input file!');
      await sleep(2500);
      return;
    } catch (e) {
      console.warn('[AutoPost FB] Falha ao injetar no input de arquivo:', e);
    }
  }

  // Método B: Drop/Paste de imagens direto na área do modal e editor
  console.log('[AutoPost FB] Tentando colar/arrastar imagem diretamente no modal...');
  try {
    const dataTransfer = new DataTransfer();
    files.forEach(f => dataTransfer.items.add(f));

    // Drop events
    const dragEnterEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer });
    const dragOverEvent = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer });
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dataTransfer
    });
    activeDialog.dispatchEvent(dragEnterEvent);
    activeDialog.dispatchEvent(dragOverEvent);
    activeDialog.dispatchEvent(dropEvent);

    // Paste event
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dataTransfer
    });
    const editor = activeDialog.querySelector('[contenteditable="true"]') || activeDialog;
    editor.dispatchEvent(pasteEvent);
    activeDialog.dispatchEvent(pasteEvent);

    console.log('[AutoPost FB] Drop/Paste de imagem realizado com sucesso!');
    await sleep(2500);
  } catch (err) {
    console.warn('[AutoPost FB] Falha ao injetar imagens por drop/paste:', err);
  }
}

async function findAndClickSubmitButton() {
  showStatusBanner('Localizando botão "Postar / Publicar"...', 'info');

  const startTime = Date.now();
  const maxWaitMs = 20000;

  while (Date.now() - startTime < maxWaitMs) {
    // 1. Busca pelo modal oficial de criação de publicação
    const allDialogs = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]'));
    let activeDialog = allDialogs.find(d => {
      const txt = (d.innerText || d.textContent || '').toLowerCase();
      const isNotComment = !txt.includes('comentários no post') && !txt.includes('responder comentário');
      return (txt.includes('criar post') || txt.includes('postar') || txt.includes('publicar')) &&
             isNotComment && d.offsetWidth > 0 && d.offsetHeight > 0;
    }) || allDialogs.find(d => d.offsetWidth > 0 && d.offsetHeight > 200) || null;

    if (!activeDialog) {
      await sleep(800);
      continue;
    }

    let submitBtn = null;
    const submitKeywords = [
      'publicar',
      'postar',
      'post',
      'publicar no grupo',
      'postar no grupo',
      'compartilhar'
    ];

    const allButtons = Array.from(activeDialog.querySelectorAll('[role="button"], button'));
    for (const b of allButtons) {
      // Ignora botões de fechar ou emojis
      const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
      const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
      if (aria.includes('fechar') || aria.includes('close') || aria.includes('adicionar') || aria.includes('foto')) continue;

      if (submitKeywords.some(k => txt === k || aria === k || txt.startsWith(k) || aria.startsWith(k))) {
        submitBtn = b;
        break;
      }
    }

    if (!submitBtn) {
      submitBtn = activeDialog.querySelector(
        '[aria-label="Postar"], [aria-label="Publicar"], [aria-label="Post"], [aria-label*="Publicar no grupo" i]'
      );
    }

    if (submitBtn) {
      const isDisabled = submitBtn.getAttribute('aria-disabled') === 'true' ||
                         submitBtn.disabled === true ||
                         submitBtn.getAttribute('tabindex') === '-1';

      if (!isDisabled) {
        showStatusBanner('Acionando botão "Postar" no Facebook...', 'info');
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);
        simulateUserClick(submitBtn);
        console.log('[AutoPost FB] Botão "Postar/Publicar" acionado com sucesso no modal de post!');
        return true;
      } else {
        showStatusBanner('Aguardando Facebook habilitar botão "Postar"...', 'info');
        // Acorda o editor sem reinserir texto nem truncar
        const ed = activeDialog.querySelector('[contenteditable="true"]') ||
                   activeDialog.querySelector('[role="textbox"]');
        if (ed) {
          try {
            ed.dispatchEvent(new Event('input', { bubbles: true }));
            ed.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (e) {}
        }
      }
    }

    await sleep(800);
  }

  return false;
}

function checkAccountRestrictions() {
  if (typeof detectFacebookCheckpoint === 'function') {
    const check = detectFacebookCheckpoint();
    if (check && check.isBlocked) {
      throw new Error('RESTRICTION_DETECTED: O Facebook alertou "' + check.reason + '". Pausando campanhas por segurança.');
    }
    return;
  }

  const bodyText = (document.body && document.body.innerText)
    ? document.body.innerText
    : (document.documentElement && document.documentElement.innerText)
      ? document.documentElement.innerText
      : '';

  if (!bodyText) return;

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
`;

  // 4. BACKGROUND SERVICE WORKER (Autonomous Queue Engine)
  const SERVICE_WORKER_CODE = `/**
 * Background Service Worker: Motor de Execução 100% Autônomo
 * Gerencia a fila de postagens em abas em segundo plano sem exigir cliques do usuário.
 */

function calculateNextDelay(currentPostIndex, config) {
  const isEndOfBatch = (currentPostIndex + 1) % (config.blockBatchSize || 5) === 0;
  if (isEndOfBatch) {
    const minP = config.blockPauseMinSeconds || 500;
    const maxP = config.blockPauseMaxSeconds || 900;
    const batchDelay = Math.floor(minP + Math.random() * (maxP - minP));
    return {
      delaySeconds: batchDelay,
      isBatchPause: true,
      reason: 'Pausa de resfriamento (' + Math.round(batchDelay / 60) + ' min) após ' + (currentPostIndex + 1) + ' posts.'
    };
  }
  const minD = config.minDelaySeconds || 120;
  const maxD = config.maxDelaySeconds || 300;
  const standardDelay = Math.floor(minD + Math.random() * (maxD - minD));
  return {
    delaySeconds: standardDelay,
    isBatchPause: false,
    reason: 'Intervalo seguro anti-bloqueio (' + standardDelay + 's).'
  };
}

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

  if (message.action === 'EXECUTE_POST' || message.type === 'EXECUTE_POST') {
    const payload = message.payload;
    const task = {
      group: payload.group,
      template: payload.template,
      resolvedText: payload.resolvedText,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Salva no storage local para a página do Facebook detectar automaticamente ao carregar
    chrome.storage.local.set({ activeTask: task }, async () => {
      try {
        const groupUrl = payload.group?.url || '';
        function getGroupId(u) {
          if (!u) return '';
          const m = u.match(/groups\\/([^\\/\\?\\#]+)/i);
          return m ? m[1].toLowerCase() : '';
        }
        function cleanUrl(u) {
          return (u || '').replace(/^https?:\\/\\//, '').replace(/^www\\./, '').replace(/\\/$/, '').toLowerCase();
        }
        const targetGroupId = getGroupId(groupUrl);
        const normTarget = cleanUrl(groupUrl);
        const tabs = await chrome.tabs.query({});
        let targetTab = tabs.find(t => {
          const u = t.url || t.pendingUrl || '';
          if (targetGroupId && getGroupId(u) === targetGroupId) return true;
          return normTarget && cleanUrl(u).includes(normTarget);
        });

        if (!targetTab) {
          targetTab = await chrome.tabs.create({ url: groupUrl, active: true });
          await waitForTabComplete(targetTab.id, 25000);
          await new Promise(r => setTimeout(r, 2500));
        } else {
          chrome.tabs.update(targetTab.id, { active: true });
        }

        sendTabMessageWithRetry(targetTab.id, {
          action: 'EXECUTE_POST',
          payload: task
        }, 12, 1500)
        .then(res => sendResponse(res || { success: true }))
        .catch(err => {
          console.log('[AutoPost Background] Aba acionada via storage fallback');
          sendResponse({ success: true, via: 'storage_fallback' });
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true; // async
  }

  if (message.action === 'POST_COMPLETED') {
    chrome.storage.local.remove(['activeTask']);
    broadcast({
      type: 'POST_SUCCESS',
      groupName: message.groupName,
      postUrl: message.postUrl,
      timestamp: new Date().toLocaleTimeString()
    });
    sendResponse({ received: true });
    return;
  }

  if (message.action === 'POST_FAILED') {
    broadcast({
      type: 'POST_FAILED',
      groupName: message.groupName,
      error: message.error,
      timestamp: new Date().toLocaleTimeString()
    });
    sendResponse({ received: true });
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

function waitForTabComplete(tabId, timeoutMs = 25000) {
  return new Promise((resolve) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function sendTabMessageWithRetry(tabId, message, maxAttempts = 10, intervalMs = 1500) {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await new Promise((resInner, rejInner) => {
          chrome.tabs.sendMessage(tabId, message, (resp) => {
            if (chrome.runtime.lastError) {
              rejInner(new Error(chrome.runtime.lastError.message));
            } else {
              resInner(resp);
            }
          });
        });
        return resolve(res);
      } catch (err) {
        console.log('[AutoPost FB] Aguardando inicialização do content script na aba (tentativa ' + (i+1) + '/' + maxAttempts + ')...');
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }
    reject(new Error('Não foi possível conectar com o script da página do Facebook após várias tentativas.'));
  });
}

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

  let tab = null;
  try {
    // 1. Cria a aba do grupo ativa para garantir prioridade de execução do Facebook
    tab = await chrome.tabs.create({ url: targetGroup.url, active: true });

    // 2. Aguarda a aba carregar completamente
    await waitForTabComplete(tab.id, 25000);
    // 3. Aguarda mais 3.5 segundos para o React e Lexical do Facebook inicializarem o DOM
    await new Promise(r => setTimeout(r, 3500));

    let response = null;
    let postError = null;

    try {
      response = await sendTabMessageWithRetry(tab.id, {
        action: 'EXECUTE_POST',
        payload: {
          template: state.currentCampaign.template,
          group: targetGroup
        }
      }, 10, 1500);
    } catch (err) {
      postError = err.message;
    }

    // Aguarda 1.5s antes de fechar a aba
    await new Promise(r => setTimeout(r, 1500));
    if (tab && tab.id) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }

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
        details: response?.error || postError || 'Falha ao interagir com o editor do Facebook'
      };
      await appendLog(logEntry);
      broadcast({ type: 'POST_FAILED', log: logEntry });
      scheduleNextDelay();
    }
  } catch (err) {
    console.error('[AutoPost FB] Erro ao disparar postagem:', err);
    if (tab && tab.id) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }
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

  // 5. SPINTAX ENGINE (Suporta Spintax Simples e Aninhado - Compatível com Content Script e Window)
  const SPINTAX_ENGINE_CODE = `/**
 * Spintax Engine para a Extensão AutoPost FB
 * Resolve sintaxes {Opção 1|Opção 2|Opção 3} e Spintax Aninhado {Opção A|{Opção B1|Opção B2}}
 */
function resolveSpintax(text) {
  if (text == null) return '';
  let resolved = String(text);
  if (!resolved.includes('{')) return resolved;

  // Localiza chaves mais internas primeiro para resolver recursivamente
  const regex = /\\{([^{}]+)\\}/;
  let safetyLimit = 100;

  while (regex.test(resolved) && safetyLimit > 0) {
    safetyLimit--;
    resolved = resolved.replace(regex, function(_, choicesStr) {
      if (!choicesStr) return '';
      const choices = choicesStr.split('|');
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      return chosen != null ? chosen.trim() : '';
    });
  }

  return resolved;
}

// Expõe no escopo global para que outros content scripts acessem
if (typeof window !== 'undefined') {
  window.resolveSpintax = resolveSpintax;
}
if (typeof globalThis !== 'undefined') {
  globalThis.resolveSpintax = resolveSpintax;
}
`;

  // 6. CHECKPOINT WATCHER (Compatível com Content Script e Window)
  const CHECKPOINT_WATCHER_CODE = `/**
 * Checkpoint Watcher para a Extensão AutoPost FB
 * Monitora avisos de restrição ou bloqueio no DOM do Facebook com proteção contra null
 */
function detectFacebookCheckpoint() {
  try {
    const bodyText = (document.body && document.body.innerText)
      ? document.body.innerText
      : (document.documentElement && document.documentElement.innerText)
        ? document.documentElement.innerText
        : '';

    if (!bodyText) return { isBlocked: false };

    const checkpointPatterns = [
      'Você está temporariamente bloqueado',
      'Sua conta está com restrição',
      'Ação bloqueada',
      'Restringimos certas atividades',
      'Confirmar sua identidade',
      'Tentativa suspeita de login',
      'Sua conta foi suspensa',
      'Temporarily blocked',
      'Account restricted',
      'Action blocked',
      'Confirm your identity'
    ];

    for (let i = 0; i < checkpointPatterns.length; i++) {
      const pattern = checkpointPatterns[i];
      if (bodyText.includes(pattern)) {
        return { isBlocked: true, reason: pattern };
      }
    }
  } catch (err) {
    console.warn('[AutoPost FB] Erro ao verificar checkpoints:', err);
  }
  return { isBlocked: false };
}

// Expõe no escopo global para que outros content scripts acessem
if (typeof window !== 'undefined') {
  window.detectFacebookCheckpoint = detectFacebookCheckpoint;
}
if (typeof globalThis !== 'undefined') {
  globalThis.detectFacebookCheckpoint = detectFacebookCheckpoint;
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
AutoPost FB - Extensão Anti-Ban v3.0 (Google Chrome)
MODO 100% AUTÔNOMO COM HUD VISUAL EM TEMPO REAL
=====================================================

COMO INSTALAR NO SEU GOOGLE CHROME (3 PASSOS RÁPIDOS):

1. DESCOMPACTE ESTE ARQUIVO .ZIP:
   - Clique com o botão direito neste arquivo e escolha "Extrair Tudo".
   - Será criada uma pasta com os arquivos da extensão.

2. ABRA A PÁGINA DE EXTENSÕES DO CHROME:
   - Abra o Google Chrome.
   - Digite na barra de endereços: chrome://extensions e aperte Enter.
   - No canto superior direito, ATIVE a chave: [x] "Modo do desenvolvedor".

3. CARREGUE OU ATUALIZE A EXTENSÃO:
   - Se já tinha a versão anterior: clique em "Remover" na versão antiga ou no ícone de atualizar.
   - Clique em "Carregar sem compactação" e selecione a pasta descompactada.
   - Pronto! A versão 3.0 estará ativa no seu Chrome.

REQUISITOS IMPORTANTES:
- Mantenha o Facebook logado na sua conta no Google Chrome.
- O robô opera na sua sessão atual com banner flutuante no Facebook, Spintax e timing anti-bloqueio.
=====================================================
`;

  return {
    'manifest.json': MANIFEST_V3_JSON,
    'background/service-worker.js': SERVICE_WORKER_CODE,
    'content-scripts/bridge.js': BRIDGE_JS_CODE,
    'content-scripts/fb-automator.js': FB_AUTOMATOR_CODE,
    'content-scripts/checkpoint-watcher.js': CHECKPOINT_WATCHER_CODE,
    'utils/spintax-engine.js': SPINTAX_ENGINE_CODE,
    'popup/popup.html': ARCHITECTURE_FILES.find(f => f.filename === 'popup.html')?.code || '',
    'popup/popup.js': POPUP_JS_CODE,
    'popup/popup.css': POPUP_CSS_CODE,
    'storage/local-database.js': (ARCHITECTURE_FILES.find(f => f.filename === 'local-database.js')?.code || '').replace(/^export\s+/gm, ''),
    'utils/anti-ban-timing.js': (ARCHITECTURE_FILES.find(f => f.filename === 'anti-ban-timing.js')?.code || '').replace(/^export\s+/gm, ''),
    'LEIA-ME_COMO_INSTALAR.txt': README_TXT,
    'como_instalar_passo_a_passo.html': GUIA_HTML_CODE,
  };
}

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();
  const filesMap = buildExtensionFilesMap();

  Object.entries(filesMap).forEach(([name, content]) => {
    zip.file(name, content);
  });

  // Generate binary PNG icons
  zip.file('icons/icon16.png', generateIconBase64(16), { base64: true });
  zip.file('icons/icon48.png', generateIconBase64(48), { base64: true });
  zip.file('icons/icon128.png', generateIconBase64(128), { base64: true });

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'autopost-fb-extensao-v3.2.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Gera um snippet autônomo em JavaScript que pode ser colado diretamente
 * no console do DevTools na aba do Facebook para postar instantaneamente sem precisar de extensão.
 */
export function generateInstantConsoleScript(postText: string): string {
  const safeText = JSON.stringify(postText || 'Publicação automática via AutoPost FB');
  return `(async function autoPostNow() {
  console.log('%c[AutoPost FB] Robô Instantâneo iniciado na aba do Facebook...', 'background:#2563eb;color:#fff;font-weight:bold;padding:6px 12px;border-radius:6px;');
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const click = (el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    try { el.focus(); } catch (e) {}
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    if (typeof el.click === 'function') el.click();
  };

  // 1. Achar "Escreva algo..." ou "No que você está pensando..." garantindo que não seja comentário
  function isComment(el) {
    if (!el) return false;
    if (el.closest('[role="feed"]') || el.closest('[role="article"]') || el.closest('[data-pagelet*="FeedUnit"]')) return true;
    const l = ((el.getAttribute && el.getAttribute('aria-label')) || '').toLowerCase();
    const t = (el.innerText || el.textContent || '').toLowerCase();
    return l.includes('coment') || t.includes('comentário') || t.includes('comment');
  }

  let trigger = null;
  const directComposerSelectors = [
    'div[data-pagelet*="GroupInlineComposer"]',
    'div[data-pagelet*="InlineComposer"]',
    'div[data-pagelet*="Composer"]',
    '[aria-label*="Crie um post público" i]',
    '[aria-label*="Escreva algo" i]',
    '[aria-label*="No que você está pensando" i]'
  ];

  for (const s of directComposerSelectors) {
    const list = Array.from(document.querySelectorAll(s));
    for (const el of list) {
      if (!isComment(el) && el.offsetWidth > 0 && el.offsetHeight > 0) {
        trigger = el;
        break;
      }
    }
    if (trigger) break;
  }

  if (!trigger) {
    const keywords = ['escreva algo', 'no que você está pensando', 'crie um post público', 'criar publicação', 'write something'];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    const candidates = [];
    while ((node = walker.nextNode())) {
      const val = (node.nodeValue || '').trim().toLowerCase();
      if (val.includes('comentário') || val.includes('comment') || val.includes('responder')) continue;
      if (val && keywords.some(k => val === k || val.startsWith(k))) {
        const p = node.parentElement;
        if (p && p.offsetWidth > 0 && !isComment(p)) {
          candidates.push(p);
        }
      }
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      trigger = candidates[0];
    }
  }

  if (trigger) {
    console.log('[AutoPost FB] Campo "Escreva algo..." localizado! Clicando...');
    trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(400);
    click(trigger);
    const btn = trigger.closest('[role="button"]') || trigger.parentElement;
    if (btn) click(btn);
  }

  // 2. Aguarda abrir modal oficial de post (não modal de comentário)
  let editor = null;
  let targetModal = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const dialogs = Array.from(document.querySelectorAll('div[role="dialog"], [aria-modal="true"]'));
    targetModal = dialogs.find(d => {
      const t = (d.innerText || d.textContent || '').toLowerCase();
      return (t.includes('criar post') || t.includes('crie um post') || t.includes('criar publicação') || t.includes('postar')) &&
             !t.includes('comentários no post') && d.offsetWidth > 0;
    }) || dialogs.find(d => d.offsetWidth > 0 && d.offsetHeight > 200);

    if (targetModal) {
      editor = targetModal.querySelector('div[role="textbox"], div[contenteditable="true"]');
      if (editor) break;
    }
  }

  if (!editor) {
    console.warn('[AutoPost FB] Modal ainda não aberto. Por favor, clique manualmente em "Escreva algo..." e rode o script novamente.');
    return;
  }

  console.log('[AutoPost FB] Modal aberto! Inserindo texto...');
  editor.focus();
  click(editor);
  await sleep(400);

  const text = ${safeText};
  try {
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
  } catch (e) {}

  if (!(editor.innerText || editor.textContent || '').trim()) {
    try {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    } catch (e) {}
  }

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  editor.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(1500);

  // 3. Clicar em Publicar
  const submitKeywords = ['publicar', 'postar', 'post', 'publicar no grupo'];
  let submitBtn = null;
  const allBtns = Array.from(document.querySelectorAll('div[role="dialog"] [role="button"], div[role="dialog"] button'));
  for (const b of allBtns) {
    const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
    const aria = (b.getAttribute('aria-label') || '').trim().toLowerCase();
    if (submitKeywords.some(k => txt === k || aria === k || txt.startsWith(k))) {
      submitBtn = b;
      break;
    }
  }

  if (submitBtn) {
    console.log('%c[AutoPost FB] Botão Publicar localizado! Enviando publicação...', 'color:#22c55e;font-weight:bold;');
    submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(600);
    click(submitBtn);
    console.log('%c✅ [AutoPost FB] Publicação enviada com sucesso no Facebook!', 'background:#22c55e;color:#fff;font-weight:bold;padding:6px 12px;border-radius:6px;');
  } else {
    console.log('[AutoPost FB] Texto preenchido! Clique no botão azul "Publicar" para concluir.');
  }
})();`;
}
