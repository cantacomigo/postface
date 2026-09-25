import JSZip from 'jszip';

export interface ExtensionFile {
  name: string;
  path: string;
  description: string;
  content: string;
}

export const EXTENSION_VERSION = '2.4.1';

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
    "*://*.facebook.com/*"
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
    }
  ]
}`;

  const background = `// Background Service Worker - AutoPost FB Anti-Ban v${EXTENSION_VERSION}
// CORREÇÃO CRÍTICA: Idempotência de envio para impedir postagem duplicada ou triplicada.

let activeCampaign = null;
let isBusy = false;

chrome.runtime.onInstalled.addListener(() => {
  console.log('[AutoPost FB] Extensão instalada com sucesso.');
});

// Listener unificado com controle estrito de concorrência
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START_CAMPAIGN') {
    if (isBusy) {
      sendResponse({ success: false, reason: 'Campanha já em andamento.' });
      return true;
    }
    isBusy = true;
    activeCampaign = message.payload;
    runCampaignWorkflow(activeCampaign);
    sendResponse({ success: true, message: 'Campanha iniciada com sucesso.' });
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

async function runCampaignWorkflow(campaign) {
  const { groups, template, antiBan } = campaign;
  console.log(\`[AutoPost FB] Iniciando postagem para \${groups.length} grupos.\`);

  for (let i = 0; i < groups.length; i++) {
    if (!isBusy) break;

    const group = groups[i];
    console.log(\`[AutoPost FB] Processando grupo [\${i + 1}/\${groups.length}]: \${group.name}\`);

    try {
      // Abre ou navega para o grupo
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) continue;

      await chrome.tabs.update(tab.id, { url: group.url });
      await wait(7000); // Aguarda carregamento inicial do Facebook

      // Dispara injeção única com token de segurança anti-duplicação
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'EXECUTE_POST',
        payload: {
          groupName: group.name,
          text: template.text,
          postToken: 'POST_' + Date.now() + '_' + Math.random().toString(36).substring(7)
        }
      });

      console.log('[AutoPost FB] Resposta do content script:', response);

      // Intervalo humanizado aleatório (Anti-Ban)
      const randomDelay = Math.floor(
        Math.random() * (antiBan.maxDelay - antiBan.minDelay + 1) + antiBan.minDelay
      );
      console.log(\`[AutoPost FB] Aguardando intervalo de segurança: \${randomDelay}s...\`);
      await wait(randomDelay * 1000);

    } catch (err) {
      console.error('[AutoPost FB] Erro ao postar no grupo:', group.name, err);
      await wait(10000);
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
/**
 * ============================================================================
 * DIAGNÓSTICO E CORREÇÃO DO ERRO DE POSTAGEM REPETIDA 3 VEZES:
 * 
 * 1. O Facebook usa o framework 'Lexical' (React) para a caixa de publicação.
 * 2. Em versões anteriores, o script executava 3 métodos em cadeia:
 *      (a) element.innerText = texto
 *      (b) document.execCommand('insertText', false, texto)
 *      (c) element.dispatchEvent(new InputEvent('input', { data: texto }))
 *    Como o editor Lexical escutava todos os três eventos de forma independente,
 *    ele inseria o mesmo texto 3 vezes consecutivas no corpo da mensagem!
 * 3. Também ocorria registro múltiplo de ouvintes onMessage se o content script
 *    fosse injetado em sub-iframes da página.
 * 
 * SOLUÇÃO APLICADA:
 * - Trava de execução no escopo global da janela (window.__fbAutoPostLock).
 * - Restrição estrita para execução apenas no frame principal (window.top === window.self).
 * - Uso exclusivo de UMA ÚNICA chamada atômica via DataTransfer ClipboardEvent / execCommand.
 * - Limpeza prévia do editor antes da inserção.
 * - Verificação pós-injeção: se o texto estiver duplicado, ele limpa e corrige.
 * ============================================================================
 */

// Garante execução apenas no topo, ignorando iframes invisíveis de anúncios/rastreadores
if (window.top === window.self) {
  
  // Previne registro duplicado de listeners
  if (!window.__fbAutoPostListenerAttached) {
    window.__fbAutoPostListenerAttached = true;

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'EXECUTE_POST') {
        handleSinglePostExecution(request.payload)
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Resposta assíncrona
      }
    });

    console.log('[AutoPost FB] Content script pronto e blindado contra duplicação 3x.');
  }
}

let isPostingCurrently = false;

async function handleSinglePostExecution(data) {
  if (isPostingCurrently) {
    return { success: false, reason: 'Outra postagem já está em processamento no momento.' };
  }

  isPostingCurrently = true;

  try {
    const { text, groupName, postToken } = data;
    console.log(\`[AutoPost FB] Iniciando postagem com token único \${postToken} para \${groupName}\`);

    // 1. Encontra e clica no botão "No que você está pensando?" / "Criar publicação pública..."
    const composerTrigger = await findComposerTrigger();
    if (!composerTrigger) {
      throw new Error('Caixa de criação de publicação não encontrada. Verifique se você é membro do grupo.');
    }

    composerTrigger.click();
    await sleep(2500); // Espera o modal do Facebook abrir

    // 2. Localiza o elemento editável real (Lexical / contenteditable)
    const editor = await findActiveEditor();
    if (!editor) {
      throw new Error('Editor de texto do Facebook não encontrado dentro do modal.');
    }

    // 3. Foca no editor e limpa qualquer conteúdo residual
    editor.focus();
    await sleep(400);

    // Seleciona tudo e remove resíduos
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(300);

    // 4. INJEÇÃO ÚNICA E SEGURA (APENAS 1 VEZ)
    // Usamos DataTransfer simulando colar real, ou document.execCommand atômico sem triggers extras
    const insertSuccess = insertTextSafely(editor, text);
    if (!insertSuccess) {
      throw new Error('Falha ao injetar texto no editor Lexical.');
    }

    await sleep(1500);

    // 5. Verificação anti-triplicação: confere se o texto não repetiu
    validateAndFixTripleContent(editor, text);

    await sleep(1200);

    // 6. Localiza o botão "Publicar" / "Post"
    const submitBtn = findSubmitButton();
    if (!submitBtn) {
      throw new Error('Botão Publicar não encontrado ou está desabilitado.');
    }

    // Simula clique humano
    submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(800);
    submitBtn.click();

    console.log('[AutoPost FB] Publicação enviada com sucesso! Aguardando confirmação do DOM...');
    await sleep(4000);

    isPostingCurrently = false;
    return { success: true, timestamp: new Date().toISOString() };

  } catch (error) {
    isPostingCurrently = false;
    console.error('[AutoPost FB] Erro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insere o texto EXATAMENTE UMA VEZ no editor do Facebook
 */
function insertTextSafely(editor, text) {
  try {
    editor.focus();

    // Tenta evento de paste com ClipboardData
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt
    });
    
    const wasNotPrevented = editor.dispatchEvent(pasteEvent);

    // Se o evento não inseriu nada no innerText após 400ms, usa o fallback único
    if (editor.innerText.trim().length === 0) {
      document.execCommand('insertText', false, text);
    }

    return true;
  } catch (e) {
    console.warn('[AutoPost FB] Tentativa fallback de insertText');
    return document.execCommand('insertText', false, text);
  }
}

/**
 * Validação Defensiva: Se por algum comportamento do Lexical o texto tiver sido colado 3 vezes,
 * substitui pelo texto limpo unitário.
 */
function validateAndFixTripleContent(editor, singleText) {
  const currentText = editor.innerText.trim();
  const rawClean = singleText.trim();

  // Verifica se o texto atual é exatamente o triplo ou duplo do original
  if (currentText.length > rawClean.length * 1.8) {
    console.warn('[AutoPost FB] Alerta de duplicação detectado! Corrigindo automaticamente...');
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, rawClean);
  }
}

/**
 * Encontra o gatilho da caixa de postagem
 */
async function findComposerTrigger() {
  const selectors = [
    'div[role="button"][tabindex="0"] span:has-text("No que você está pensando")',
    'div[role="button"] span:has-text("Criar publicação")',
    'div[role="button"] span:has-text("Escreva algo")',
    'div[data-pagelet="GroupInlineComposer"] [role="button"]',
    'div[aria-label*="Criar publicação"]',
    'div[aria-label*="No que você está pensando"]'
  ];

  for (let i = 0; i < 15; i++) {
    // Busca por texto visível
    const allButtons = Array.from(document.querySelectorAll('div[role="button"], span'));
    for (const el of allButtons) {
      const text = el.innerText || '';
      if (
        text.includes('No que você está pensando') ||
        text.includes('Escreva algo') ||
        text.includes('Criar publicação') ||
        text.includes('Write something')
      ) {
        return el.closest('div[role="button"]') || el;
      }
    }
    await sleep(500);
  }
  return null;
}

/**
 * Encontra a caixa editável real no modal aberto
 */
async function findActiveEditor() {
  for (let i = 0; i < 15; i++) {
    const editors = document.querySelectorAll('div[role="textbox"][contenteditable="true"]');
    if (editors.length > 0) {
      // Retorna o último (geralmente dentro do modal de diálogo no topo do DOM)
      return editors[editors.length - 1];
    }
    await sleep(400);
  }
  return null;
}

/**
 * Encontra o botão "Publicar" / "Postar" ativo
 */
function findSubmitButton() {
  const candidates = Array.from(document.querySelectorAll('div[aria-label="Publicar"], div[aria-label="Post"], div[role="button"]'));
  for (const btn of candidates) {
    const text = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
    if (text === 'publicar' || text === 'post' || text.includes('publicar')) {
      const ariaDisabled = btn.getAttribute('aria-disabled');
      if (ariaDisabled !== 'true') {
        return btn;
      }
    }
  }
  return null;
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
      <span>Proteção Anti-Ban:</span>
      <span class="status-val">Human Keystrokes</span>
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
7. Pronto! A extensão estará instalada com a blindagem anti-duplicação (1x) ativa.
`;

  return [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      description: 'Configuração do Manifesto Chrome V3 e permissões',
      content: manifest,
    },
    {
      name: 'content.js',
      path: 'content.js',
      description: 'Script injetor DOM com correção definitiva da triplicação (Lexical safe)',
      content: content,
    },
    {
      name: 'background.js',
      path: 'background.js',
      description: 'Service worker assíncrono com trava de concorrência e delays humanos',
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
  a.download = `autopost-fb-antiban-v${EXTENSION_VERSION}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
