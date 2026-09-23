import React, { useState, useEffect } from 'react';
import { ShieldCheck, Layers, PlayCircle, FolderKanban, BarChart3, Code2, Globe, Laptop, Download, Check, Chrome, Zap } from 'lucide-react';
import { downloadExtensionZip } from '../utils/extensionPackage';
import { ExtensionInstallerModal } from './extension/ExtensionInstallerModal';

interface HeaderProps {
  activeTab: 'campaign' | 'templates' | 'groups' | 'reports' | 'architecture' | 'extension_popup';
  setActiveTab: (tab: 'campaign' | 'templates' | 'groups' | 'reports' | 'architecture' | 'extension_popup') => void;
  isRunning: boolean;
  totalLogs: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isRunning,
  totalLogs
}) => {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipDownloaded, setZipDownloaded] = useState(false);
  const [showInstallerModal, setShowInstallerModal] = useState(false);
  const [isExtensionDetected, setIsExtensionDetected] = useState(false);

  // Escuta status da Extensão do Chrome via bridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'AUTOPPOST_EXTENSION_CONNECTED' ||
        event.data?.source === 'AUTOPPOST_CHROME_EXTENSION'
      ) {
        setIsExtensionDetected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    // Ping inicial para acordar a extensão se já estiver instalada
    window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCheckExtensionStatus = () => {
    window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      await downloadExtensionZip();
      setZipDownloaded(true);
      setTimeout(() => setZipDownloaded(false), 3000);
    } catch (err) {
      console.error('Falha ao baixar zip da extensão:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold tracking-tight text-white">AutoPost FB</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Anti-Ban v3.2 (Manifest V3)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Automação Silenciosa • Sessão Ativa • Zero-Knowledge de Senhas
                </p>
              </div>
            </div>

            {/* Session Status & Security indicators */}
            <div className="flex items-center gap-2.5 text-xs flex-wrap justify-end">
              {/* Botão de Instalação Guiada */}
              <button
                onClick={() => setShowInstallerModal(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Como instalar a extensão no Chrome para rodar 100% sozinho"
              >
                <Chrome className="w-3.5 h-3.5 text-blue-400" />
                <span>Instalar Extensão</span>
              </button>

              {/* Botão de Download Rápido do ZIP */}
              <button
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                title="Baixar pacote pronto da Extensão Manifest V3 para o Google Chrome"
              >
                {zipDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Extensão Baixada!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingZip ? 'Gerando ZIP...' : 'Baixar Extensão (.ZIP)'}</span>
                  </>
                )}
              </button>

              {/* Status Badge */}
              {isExtensionDetected ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Extensão Chrome Conectada (100% Automático)</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Robô: <strong className="text-slate-100">100% Autônomo</strong></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              )}

              {isRunning && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/30 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="font-semibold">Disparador Ativo</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-2 scrollbar-none">
            <button
              id="nav-campaign-tab"
              onClick={() => setActiveTab('campaign')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'campaign'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Motor de Disparo</span>
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              id="nav-extension-popup-tab"
              onClick={() => setActiveTab('extension_popup')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'extension_popup'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Chrome className="w-4 h-4 text-emerald-400" />
              <span>Extensão Chrome (Instalação & Automação)</span>
            </button>

            <button
              id="nav-templates-tab"
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Templates de Postagem</span>
            </button>

            <button
              id="nav-groups-tab"
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'groups'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Grupos & Categorias</span>
            </button>

            <button
              id="nav-reports-tab"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Relatórios & Logs</span>
              {totalLogs > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-xs rounded-full text-slate-300">
                  {totalLogs}
                </span>
              )}
            </button>

            <button
              id="nav-architecture-tab"
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'architecture'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Código Fonte da Extensão</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal de Instalação Passo a Passo */}
      <ExtensionInstallerModal
        isOpen={showInstallerModal}
        onClose={() => setShowInstallerModal(false)}
        isExtensionDetected={isExtensionDetected}
        onCheckExtensionStatus={handleCheckExtensionStatus}
      />
    </>
  );
};
