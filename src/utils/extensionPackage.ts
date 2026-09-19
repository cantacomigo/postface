import JSZip from 'jszip';
import { ARCHITECTURE_FILES } from '../data/architectureDocs';

export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // Supplementary files needed for full extension execution
  const SPINTAX_ENGINE_CODE = `/**
 * Spintax Engine para a Extensão AutoPost FB
 * Resolve sintaxe dinâmica {Opção 1|Opção 2|Opção 3}
 */
export function resolveSpintax(text) {
  if (!text) return '';
  const regex = /\\{([^{}]+)\\}/g;
  let resolved = text;
  let matches;
  while ((matches = regex.exec(resolved)) !== null) {
    const fullMatch = matches[0];
    const options = matches[1].split('|');
    const chosen = options[Math.floor(Math.random() * options.length)];
    resolved = resolved.replace(fullMatch, chosen);
    regex.lastIndex = 0;
  }
  return resolved;
}
`;

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
        btnStart.style.display = 'none';
        btnPause.style.display = 'block';
        phaseTextEl.innerText = 'Disparador ativo em segundo plano...';
      } else {
        btnStart.style.display = 'block';
        btnPause.style.display = 'none';
        phaseTextEl.innerText = 'Pronto para iniciar.';
      }
    }
  });

  // Listener para iniciar
  if (btnStart) {
    btnStart.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://postface-orcin.vercel.app' });
    });
  }
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
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 11px; font-weight: 600; color: #94a3b8; margin-bottom: 4px; }
select { width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px; border-radius: 8px; font-size: 12px; }
.actions { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
.btn { width: 100%; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-warning { background: #d97706; color: #fff; }
.btn-secondary { background: #334155; color: #f8fafc; }
.btn-secondary:hover { background: #475569; }
.recent-logs { margin-top: 16px; border-top: 1px solid #1e293b; padding-top: 12px; }
.recent-logs h3 { font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; }
.logs-list { max-height: 100px; overflow-y: auto; font-size: 11px; color: #cbd5e1; }
`;

  const README_TXT = `=====================================================
AutoPost FB - Extensão Anti-Ban v2.4 (Google Chrome)
=====================================================

COMO INSTALAR NO SEU NAVEGADOR (3 PASSOS RÁPIDOS):

1. DESCOMPACTE ESTE ARQUIVO .ZIP:
   - Clique com botão direito neste arquivo .zip e escolha "Extrair Tudo".
   - Você terá uma pasta contendo os arquivos (manifest.json, background, etc.).

2. ABRA A PÁGINA DE EXTENSÕES DO CHROME:
   - Abra o Google Chrome.
   - Digite na barra de endereços: chrome://extensions e aperte Enter.
   - No canto superior direito, ative a chave: [x] "Modo do desenvolvedor".

3. CARREGUE A EXTENSÃO:
   - No canto superior esquerdo, clique no botão: "Carregar sem compactação".
   - Selecione a pasta que você extraiu no Passo 1.
   - Pronto! O ícone do AutoPost FB aparecerá nas suas extensões do Chrome!

REQUISITOS:
- Mantenha o Facebook aberto e logado na sua conta no mesmo navegador.
- O robô usará a sua sessão residencial ativa para navegar e postar de forma segura com delays anti-ban.
=====================================================
`;

  // Add all architecture files to zip
  for (const file of ARCHITECTURE_FILES) {
    zip.file(file.path, file.code);
  }

  // Add supporting files
  zip.file('utils/spintax-engine.js', SPINTAX_ENGINE_CODE);
  zip.file('content-scripts/checkpoint-watcher.js', CHECKPOINT_WATCHER_CODE);
  zip.file('popup/popup.js', POPUP_JS_CODE);
  zip.file('popup/popup.css', POPUP_CSS_CODE);
  zip.file('LEIA-ME_COMO_INSTALAR.txt', README_TXT);

  // Generate ZIP blob and trigger download
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
