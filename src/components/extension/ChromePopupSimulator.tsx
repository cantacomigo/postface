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
  Square,
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
  Sliders,
  SkipForward,
  Send,
  Download,
  Copy,
  Check,
  Chrome,
  Zap,
  Bot
} from 'lucide-react';
import { resolveSpintax } from '../../utils/spintax';
import { downloadExtensionZip } from '../../utils/extensionPackage';
import { ExtensionInstallerModal } from './ExtensionInstallerModal';

interface ChromePopupSimulatorProps {
  templates: PostTemplate[];
  groups: FacebookGroup[];
  categories: GroupCategory[];
  antiBanRules: AntiBanRules;
  campaign: ActiveCampaign;
  logs: CampaignLog[];
  onStartCampaign: (templateId?: string, categoryId?: string) => void;
  onPauseCampaign: () => void;
  onResumeCampaign: () => void;
  onStopCampaign: () => void;
  onSkipWait: () => void;
  onSelectTemplate: (tplId: string) => void;
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
  onStopCampaign,
  onSkipWait,
  onSelectTemplate,
  onOpenFullDashboard
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'popup' | 'serviceworker' | 'contentscript' | 'storage'>('popup');

  // Popup local selections
  const [popupSelectedTemplateId, setPopupSelectedTemplateId] = useState<string>(
    campaign.templateId || templates[0]?.id || ''
  );
  const [popupSelectedCategoryId, setPopupSelectedCategoryId] = useState<string>('all');

  // Interactive Tab 1 (Popup UI) test state
  const [bridgeTestLog, setBridgeTestLog] = useState<string | null>(null);
  const [isSendingPing, setIsSendingPing] = useState<boolean>(false);

  // Interactive Tab 3 (Content Script) DOM test state
  const [domTestStep, setDomTestStep] = useState<number>(0);
  const [isTestingDom, setIsTestingDom] = useState<boolean>(false);

  // Interactive Tab 4 (Storage) state
  const [copiedStorage, setCopiedStorage] = useState<boolean>(false);

  // Real Extension State
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [zipDownloaded, setZipDownloaded] = useState<boolean>(false);
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);
  const [isExtensionDetected, setIsExtensionDetected] = useState<boolean>(false);

  React.useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'AUTOPPOST_EXTENSION_CONNECTED' ||
        event.data?.source === 'AUTOPPOST_CHROME_EXTENSION'
      ) {
        setIsExtensionDetected(true);
      }
    };
    window.addEventListener('message', handleBridgeMessage);
    window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      await downloadExtensionZip();
      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 3000);
    } catch (err) {
      console.error('Erro ao gerar extensão:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  const selectedTemplate =
    templates.find((t) => t.id === popupSelectedTemplateId) || templates[0];

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const eligibleInPopup = groups.filter(
    (g) =>
      g.status === 'active' &&
      (popupSelectedCategoryId === 'all' || g.categoryId === popupSelectedCategoryId)
  );

  // Test Bridge Message
  const handleTestBridgeMessage = () => {
    setIsSendingPing(true);
    setBridgeTestLog('Disparando chrome.runtime.sendMessage({ action: "PING" })...');
    setTimeout(() => {
      setBridgeTestLog(
        `✓ Resposta do Service Worker recebida em 14ms: { status: "PONG", sessionActive: true, version: "MV3" }`
      );
      setIsSendingPing(false);
    }, 600);
  };

  // Run DOM Injection Simulation
  const handleRunDomTest = () => {
    setIsTestingDom(true);
    setDomTestStep(1);

    setTimeout(() => {
      setDomTestStep(2);
      setTimeout(() => {
        setDomTestStep(3);
        setTimeout(() => {
          setDomTestStep(4);
          setIsTestingDom(false);
        }, 800);
      }, 900);
    }, 800);
  };

  // Export JSON backup of chrome.storage.local
  const handleExportStorageJSON = () => {
    const backupData = {
      manifestVersion: 3,
      extension: 'Facebook Group Automation Anti-Ban',
      exportedAt: new Date().toISOString(),
      storage: {
        templates,
        groups,
        categories,
        antiBanRules,
        campaignState: campaign,
        logsCount: logs.length
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chrome_storage_local_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Storage State
  const handleCopyStorage = () => {
    const previewData = {
      templatesCount: templates.length,
      groupsCount: groups.length,
      categoriesCount: categories.length,
      activeCampaign: campaign.status,
      antiBanRules
    };
    navigator.clipboard.writeText(JSON.stringify(previewData, null, 2));
    setCopiedStorage(true);
    setTimeout(() => setCopiedStorage(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Real Extension Download & Installation Card */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-5 rounded-2xl border border-blue-800/60 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Chrome className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white">
                Extensão Real do Chrome (Manifest V3 Pronta)
              </h3>
              {isExtensionDetected ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Instalada e Conectada ao Painel
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Pronta para Instalação no Chrome
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Baixe o pacote zip com o <code>manifest.json</code>, <code>service-worker.js</code> e <code>fb-automator.js</code> para automação 100% autônoma no Facebook sem intervenção manual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            {zipDownloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Extensão Baixada!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{downloadingZip ? 'Gerando...' : 'Baixar Extensão (.ZIP)'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowInstallerModal(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <Chrome className="w-4 h-4 text-blue-400" />
            <span>Guia Passo a Passo no Chrome</span>
          </button>
        </div>
      </div>

      {/* Header explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-600" />
            Simulador Interativo da Extensão (Manifest V3)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Visualize e acione em tempo real o Popup UI, o Service Worker de segundo plano, o Content Script e o chrome.storage.local.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('popup')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'popup'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Popup UI
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('serviceworker')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'serviceworker'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Service Worker
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('contentscript')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'contentscript'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Content Script
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('storage')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeSubTab === 'storage'
                ? 'bg-white text-purple-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4. Local Database
          </button>
        </div>
      </div>

      {/* Main interactive showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Simulated Browser & Popup Frame */}
        <div className="lg:col-span-5 flex justify-center">
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
                    <h3 className="text-xs font-bold tracking-tight text-white leading-tight">
                      AutoPost FB
                    </h3>
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
              <div className="p-4 space-y-3 text-xs text-slate-700">
                {/* Countdown Box */}
                <div className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl text-center space-y-1 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Próximo Envio (Delay Anti-Ban)
                  </span>
                  <div className="text-2xl font-extrabold font-mono text-emerald-400">
                    {campaign.status === 'running'
                      ? formatTime(campaign.nextPostCountdown)
                      : '--:--'}
                  </div>
                  <p className="text-[10px] text-slate-300 truncate">
                    {campaign.currentPhaseText || 'Aguardando inicialização'}
                  </p>

                  {/* Skip Wait button right inside popup */}
                  {campaign.status === 'running' && campaign.nextPostCountdown > 3 && (
                    <button
                      type="button"
                      onClick={onSkipWait}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-300 hover:text-white bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700 transition-colors"
                    >
                      <SkipForward className="w-3 h-3" />
                      Pular espera do delay
                    </button>
                  )}
                </div>

                {/* Interactive Template Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    1. Template de Anúncio:
                  </label>
                  <select
                    value={popupSelectedTemplateId}
                    disabled={campaign.status === 'running'}
                    onChange={(e) => {
                      setPopupSelectedTemplateId(e.target.value);
                      onSelectTemplate(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.title} ({tpl.images.length} fotos)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Category Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    2. Categoria de Grupos ({eligibleInPopup.length} ativos):
                  </label>
                  <select
                    value={popupSelectedCategoryId}
                    disabled={campaign.status === 'running'}
                    onChange={(e) => setPopupSelectedCategoryId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">Todas as Categorias ({groups.filter((g) => g.status === 'active').length} grupos)</option>
                    {categories.map((cat) => {
                      const count = groups.filter((g) => g.categoryId === cat.id && g.status === 'active').length;
                      return (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({count} grupos)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Progress Mini Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progresso da Fila:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {campaign.currentIndex} / {campaign.totalGroups}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${
                          campaign.totalGroups > 0
                            ? (campaign.currentIndex / campaign.totalGroups) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="pt-1 flex flex-col gap-1.5">
                  {campaign.status === 'running' ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={onPauseCampaign}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pausar
                      </button>
                      <button
                        type="button"
                        onClick={onStopCampaign}
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Parar
                      </button>
                    </div>
                  ) : campaign.status === 'paused' ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={onResumeCampaign}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Retomar Disparos
                      </button>
                      <button
                        type="button"
                        onClick={onStopCampaign}
                        className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Encerrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onStartCampaign(popupSelectedTemplateId, popupSelectedCategoryId)
                      }
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Iniciar Campanha no Popup
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onOpenFullDashboard}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-[11px] flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Abrir Painel Completo (Dashboard)</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {/* Mini Recent Logs in Popup */}
                <div className="border-t border-slate-100 pt-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    Últimos Registros
                  </span>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
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
        <div className="lg:col-span-7 space-y-4">
          {activeSubTab === 'popup' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-600">
                  <Laptop className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">
                    1. Painel de Controle (Dashboard / Popup UI)
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  UI Ativa
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Renderizado na janela suspensa de 380px ao clicar no ícone da extensão. Ele se comunica de forma assíncrona com o <code>service-worker.js</code> através de <code>chrome.runtime.sendMessage</code>.
              </p>

              {/* Interactive Test Button */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Teste de Comunicação Assíncrona (Bridge Message)
                  </span>
                  <button
                    type="button"
                    onClick={handleTestBridgeMessage}
                    disabled={isSendingPing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingPing ? 'Transmitindo...' : 'Disparar Ping'}
                  </button>
                </div>

                {bridgeTestLog && (
                  <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg border border-slate-800 animate-fadeIn">
                    {bridgeTestLog}
                  </div>
                )}
              </div>

              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Gerenciamento de Modelos:</strong> Seleciona e troca templates com pré-visualização imediata.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Segmentação por Categorias:</strong> Filtra grupos e ajusta a fila de postagens instantaneamente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Monitoramento Ativo:</strong> Exibe a contagem regressiva e permite intervenções como pausar ou acelerar.</span>
                </li>
              </ul>
            </div>
          )}

          {activeSubTab === 'serviceworker' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Terminal className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">
                    2. Background Service Worker (Fila & Cronograma)
                  </h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                  chrome.alarms API
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Atua como o &quot;cérebro&quot; independente. Os alarmes e timers continuam rodando em segundo plano mesmo se a janela pop-up for fechada pelo usuário.
              </p>

              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1.5 border border-slate-800">
                <div className="text-emerald-400">// Estado em Tempo Real (service-worker.js):</div>
                <div>Status do Motor: <span className="text-amber-400 font-bold">{campaign.status.toUpperCase()}</span></div>
                <div>Fila de Grupos: <span className="text-blue-300">{campaign.totalGroups} destinos configurados</span></div>
                <div>Lote Atual: <span className="text-emerald-300">{campaign.postsInCurrentBatch} de {antiBanRules.blockBatchSize} disparos</span></div>
                <div>Intervalo com Jitter: <span className="text-purple-300">{antiBanRules.minDelaySeconds}s - {antiBanRules.maxDelaySeconds}s</span></div>
                <div>Pausa Longa de Lote: <span className="text-indigo-300">{antiBanRules.blockPauseMinSeconds}s - {antiBanRules.blockPauseMaxSeconds}s</span></div>
              </div>

              {/* Action button to trigger cycle */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs">
                <span className="text-indigo-900 font-medium">
                  Simulação de Alarme: avançar ciclo de espera
                </span>
                <button
                  type="button"
                  onClick={onSkipWait}
                  disabled={campaign.status !== 'running'}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Disparar Alarme Agora
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'contentscript' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Globe className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">
                    3. Content Script (Automação do Facebook)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleRunDomTest}
                  disabled={isTestingDom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  {isTestingDom ? 'Executando...' : 'Testar Injeção no DOM'}
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Injetado na aba aberta do Facebook. Localiza os seletores nativos do Lexical Composer e digita o texto gerado pelo Spintax de forma humana:
              </p>

              {/* Progress Steps */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800">Rotina de Injeção no DOM:</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {isTestingDom ? 'Em execução...' : domTestStep === 4 ? 'Concluído com Sucesso' : 'Aguardando teste'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className={`flex items-center gap-2 text-xs ${domTestStep >= 1 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${domTestStep >= 1 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>1. <code>checkAccountRestrictions()</code> → Validação de checkpoint/bloqueio</span>
                  </div>

                  <div className={`flex items-center gap-2 text-xs ${domTestStep >= 2 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${domTestStep >= 2 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>2. <code>composerTrigger.click()</code> → Abertura do modal de criação</span>
                  </div>

                  <div className={`flex items-center gap-2 text-xs ${domTestStep >= 3 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${domTestStep >= 3 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>3. <code>simulateHumanTyping(40-120ms)</code> → Digitação sintética no editor Lexical</span>
                  </div>

                  <div className={`flex items-center gap-2 text-xs ${domTestStep >= 4 ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${domTestStep >= 4 ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>4. <code>submitButton.click()</code> → Publicação e captura do ID do post</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'storage' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-600">
                  <Database className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-base">
                    4. Banco de Dados Local (chrome.storage.local)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyStorage}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
                  >
                    {copiedStorage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleExportStorageJSON}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar JSON
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Todos os dados (modelos, categorias, links de grupos e relatórios) permanecem estritamente no armazenamento local do navegador do usuário.
              </p>

              <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1.5 border border-slate-800">
                <div className="text-purple-400">// Estado das Coleções Locais:</div>
                <div className="text-slate-300">• templates: <span className="text-emerald-400">{templates.length} registros</span></div>
                <div className="text-slate-300">• groups: <span className="text-emerald-400">{groups.length} grupos cadastrados</span></div>
                <div className="text-slate-300">• categories: <span className="text-emerald-400">{categories.length} categorias</span></div>
                <div className="text-slate-300">• postLogs: <span className="text-emerald-400">{logs.length} envios registrados</span></div>
              </div>
            </div>
          )}

          {/* Technical Execution Loop Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Garantias de Segurança Anti-Bloqueio
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>1. Zero Credenciais:</strong><br />Opera na aba autenticada sem coletar senhas.
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>2. Fingerprint Real:</strong><br />Mesmo IP residencial e hardware genuíno.
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>3. Digitação Humana:</strong><br />Simulação de teclas com jitter e atrasos variáveis.
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <strong>4. Pausas de Lote:</strong><br />Resfriamento automático de sessão por bloco.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extension Installer Modal */}
      <ExtensionInstallerModal
        isOpen={showInstallerModal}
        onClose={() => setShowInstallerModal(false)}
        isExtensionDetected={isExtensionDetected}
        onCheckExtensionStatus={() => {
          window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
        }}
        onActivateFullAutonomousMode={() => {
          setShowInstallerModal(false);
        }}
      />
    </div>
  );
};
