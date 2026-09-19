import React, { useState } from 'react';
import {
  PostTemplate,
  FacebookGroup,
  GroupCategory,
  AntiBanRules,
  ActiveCampaign,
  CampaignLog
} from '../../types';
import {
  Play,
  Pause,
  Clock,
  ShieldCheck,
  Globe,
  Layers,
  Database,
  Terminal,
  ExternalLink,
  Laptop,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { resolveSpintax } from '../../utils/spintax';

interface ChromePopupSimulatorProps {
  templates: PostTemplate[];
  groups: FacebookGroup[];
  categories: GroupCategory[];
  antiBanRules: AntiBanRules;
  campaign: ActiveCampaign;
  logs: CampaignLog[];
  onStartCampaign: () => void;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onOpenFullDashboard: () => void;
}

export const ChromePopupSimulator: React.FC<ChromePopupSimulatorProps> = ({
  templates,
  groups,
  categories,
  antiBanRules,
  campaign,
  logs,
  onStartCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onOpenFullDashboard
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'popup' | 'serviceworker' | 'contentscript' | 'storage'>('popup');

  const selectedTemplate = templates.find((t) => t.id === campaign.templateId) || templates[0];
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            Simulador Interativo da Extensão (Manifest V3)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Visualize em tempo real como o Popup UI, o Service Worker de segundo plano, o Content Script e o chrome.storage.local operam em conjunto.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setActiveSubTab('popup')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'popup' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Popup UI
          </button>
          <button
            onClick={() => setActiveSubTab('serviceworker')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'serviceworker' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Service Worker
          </button>
          <button
            onClick={() => setActiveSubTab('contentscript')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'contentscript' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Content Script
          </button>
          <button
            onClick={() => setActiveSubTab('storage')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'storage' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Local Database
          </button>
        </div>
      </div>

      {/* Main interactive showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Simulated Browser & Popup Frame */}
        <div className="lg:col-span-6 flex justify-center">
          <div className="w-full max-w-[420px] bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-800">
            {/* Chrome Window Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-slate-400 text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded-full text-[11px] text-slate-300 font-mono">
                <Globe className="w-3 h-3 text-blue-400" />
                <span>facebook.com/groups</span>
              </div>

              <div className="w-5 h-5 rounded-md bg-blue-600/30 text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-500/40">
                FB
              </div>
            </div>

            {/* Popup Window Container (380px) */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-inner border border-slate-200">
              {/* Popup Header */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold tracking-tight text-white leading-tight">AutoPost FB</h3>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sessão Ativa Conectada
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                  v1.0 (MV3)
                </span>
              </div>

              {/* Popup Body */}
              <div className="p-4 space-y-3.5 text-xs text-slate-700">
                {/* Countdown Box */}
                <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl text-center space-y-1 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Próximo Envio (Delay Anti-Ban)
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-emerald-400">
                    {campaign.status === 'running' ? formatTime(campaign.nextPostCountdown) : '--:--'}
                  </div>
                  <p className="text-[10px] text-slate-300 truncate">
                    {campaign.currentPhaseText}
                  </p>
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Template Selecionado:
                  </label>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 flex items-center justify-between">
                    <span className="truncate">{selectedTemplate?.title}</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {selectedTemplate?.images.length} fotos
                    </span>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progresso do Lote:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {campaign.currentIndex} / {campaign.totalGroups}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${campaign.totalGroups > 0 ? (campaign.currentIndex / campaign.totalGroups) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="pt-1 flex flex-col gap-2">
                  {campaign.status === 'running' ? (
                    <button
                      onClick={onPauseCampaign}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pausar Disparos
                    </button>
                  ) : campaign.status === 'paused' ? (
                    <button
                      onClick={onResumeCampaign}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Retomar Disparos
                    </button>
                  ) : (
                    <button
                      onClick={onStartCampaign}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Iniciar Campanha
                    </button>
                  )}

                  <button
                    onClick={onOpenFullDashboard}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Abrir Painel Completo (Dashboard)</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Mini Recent Logs in Popup */}
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Últimos Envios</span>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {logs.slice(0, 3).map((log) => (
                      <div
                        key={log.id}
                        className="p-1.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px]"
                      >
                        <span className="truncate max-w-[180px] font-medium text-slate-700">
                          {log.groupName}
                        </span>
                        <span className="text-emerald-600 font-semibold">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Deep-Dive for the Selected Component */}
        <div className="lg:col-span-6 space-y-4">
          {activeSubTab === 'popup' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Laptop className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  1. Painel de Controle (Dashboard / Popup UI)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Renderizado na janela suspensa (popup) de 380px ao clicar no ícone da extensão no Chrome. Ele consome o estado gerenciado pelo <code>service-worker.js</code> e permite:
              </p>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Gerenciamento de Templates:</strong> Criação rápida de modelos com suporte a mídias e preview de Spintax.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Organização de Grupos:</strong> Filtro por categorias personalizadas para segmentação geográfica ou de nicho.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Monitor em Tempo Real:</strong> Contagem regressiva visual do próximo envio e logs dos disparos efetuados.</span>
                </li>
              </ul>
            </div>
          )}

          {activeSubTab === 'serviceworker' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <Terminal className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  2. Background Service Worker (Fila & Cronograma)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Atua como o &quot;cérebro&quot; em segundo plano da extensão. Utiliza a <code>chrome.alarms API</code> para que o ciclo anti-bloqueio continue executando mesmo se a janela pop-up for fechada.
              </p>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1 border border-slate-800">
                <div className="text-emerald-400">// Estado Atual no Service Worker:</div>
                <div>Status: <span className="text-amber-400">{campaign.status.toUpperCase()}</span></div>
                <div>Fila Total: <span className="text-blue-300">{campaign.totalGroups} grupos</span></div>
                <div>Disparos no Lote Atual: <span className="text-emerald-300">{campaign.postsInCurrentBatch} / {antiBanRules.blockBatchSize}</span></div>
                <div>Algoritmo de Delay: <span className="text-purple-300">{antiBanRules.minDelaySeconds}s - {antiBanRules.maxDelaySeconds}s com Jitter</span></div>
                <div>Pausa Longa de Lote: <span className="text-indigo-300">{antiBanRules.blockPauseMinSeconds}s - {antiBanRules.blockPauseMaxSeconds}s</span></div>
              </div>
            </div>
          )}

          {activeSubTab === 'contentscript' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Globe className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  3. Content Script (Automação do Facebook)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Injetado pontualmente na aba aberta do Facebook. Executa a navegação na página do grupo, localiza a caixa de criação no DOM e simula digitação humana no editor Lexical:
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Workflow de Injeção no DOM:
                </div>
                <div className="grid grid-cols-1 gap-1.5 pl-4 font-mono text-[11px] text-slate-600">
                  <div>1. <code>checkAccountRestrictions()</code> → Valida se há checkpoint</div>
                  <div>2. <code>composerTrigger.click()</code> → Abre o modal de post</div>
                  <div>3. <code>simulateHumanTyping(charDelay: 40-120ms)</code> → Digita copy</div>
                  <div>4. <code>simulateMediaAttachment()</code> → Anexa até 10 imagens</div>
                  <div>5. <code>submitButton.click()</code> → Confirma publicação</div>
                  <div>6. Notifica o relatório com o link do post gerado</div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'storage' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Database className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  4. Banco de Dados Local (chrome.storage.local)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Todos os dados (templates, grupos, categorias e relatórios) são salvos diretamente no armazenamento criptografado local do Google Chrome. <strong>Nenhum dado trafega para servidores externos</strong>.
              </p>

              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1.5 border border-slate-800">
                <div className="text-purple-400">// Chaves Armazenadas em chrome.storage.local:</div>
                <div className="text-slate-300">• templates: <span className="text-emerald-400">{templates.length} registros</span></div>
                <div className="text-slate-300">• groups: <span className="text-emerald-400">{groups.length} grupos</span></div>
                <div className="text-slate-300">• categories: <span className="text-emerald-400">{categories.length} categorias</span></div>
                <div className="text-slate-300">• postLogs: <span className="text-emerald-400">{logs.length} envios registrados</span></div>
              </div>
            </div>
          )}

          {/* Technical Execution Loop Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Fluxo de Execução Técnica Contínua
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>1. Abertura da Sessão:</strong><br />Aba do Facebook aberta na mesma máquina.
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>2. Início da Campanha:</strong><br />Seleção do template e categorias no popup.
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>3. Loop de Disparo:</strong><br />Injeção no DOM + Verificação de envio.
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>4. Temporização Segura:</strong><br />Delay randômico (120-300s) e pausa em lote.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
