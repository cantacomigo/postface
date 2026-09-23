import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Zap,
  Layers,
  AlertTriangle,
  FolderOpen,
  Chrome,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { downloadExtensionZip } from '../../utils/extensionPackage';

interface ExtensionInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isExtensionDetected: boolean;
  onCheckExtensionStatus: () => void;
  onActivateFullAutonomousMode?: () => void;
}

export const ExtensionInstallerModal: React.FC<ExtensionInstallerModalProps> = ({
  isOpen,
  onClose,
  isExtensionDetected,
  onCheckExtensionStatus,
  onActivateFullAutonomousMode
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [pinging, setPinging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      onCheckExtensionStatus();
    }
  }, [isOpen, onCheckExtensionStatus]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadExtensionZip();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyChromeUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleTestPing = () => {
    setPinging(true);
    window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
    setTimeout(() => {
      onCheckExtensionStatus();
      setPinging(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-slate-900 border-b border-slate-700/80 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Chrome className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Instalar Extensão do Google Chrome
                </h2>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Modo 100% Autônomo
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Para o sistema postar sozinho sem você precisar clicar ou colar nada, a extensão roda diretamente na sua sessão do Facebook.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className="px-6 pt-5">
          {isExtensionDetected ? (
            <div className="bg-emerald-950/60 border border-emerald-600/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    Extensão Chrome Instalada e Conectada com Sucesso!
                  </h4>
                  <p className="text-xs text-emerald-400/90 mt-0.5">
                    O robô silencioso está ativo e fará 100% das postagens sozinho no Facebook.
                  </p>
                </div>
              </div>
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
          ) : (
            <div className="bg-amber-950/40 border border-amber-600/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300">
                    Aguardando Instalação no Chrome
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Siga os 3 passos abaixo para carregar a extensão em menos de 30 segundos:
                  </p>
                </div>
              </div>
              <button
                onClick={handleTestPing}
                disabled={pinging}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
                <span>{pinging ? 'Verificando...' : 'Verificar Conexão'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 3 Step Installation Flow */}
        <div className="p-6 space-y-4">
          {/* Passo 1 */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Baixar o Pacote da Extensão (.ZIP)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pacote pronto Manifest V3 com Service Worker e robô de automação do Facebook.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full sm:w-auto shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {downloaded ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Arquivo Baixado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Gerando Pacote...' : 'Baixar Extensão (.ZIP)'}</span>
                </>
              )}
            </button>
          </div>

          {/* Passo 2 */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shrink-0 mt-0.5">
              2
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-white">
                Descompactar / Extrair a Pasta
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Vá até a sua pasta de <strong>Downloads</strong>, clique com o <strong>botão direito</strong> no arquivo baixado <code className="bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded text-[11px]">autopost-fb-extensao-v3.2.zip</code> e selecione <strong className="text-slate-200">"Extrair Tudo"</strong> para criar uma pasta.
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Carregar no Google Chrome
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Siga estas 3 ações rápidas no seu navegador:
                </p>
              </div>

              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-700/80 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">
                    A. Em uma nova aba, abra: <strong className="text-blue-400 font-mono">chrome://extensions</strong>
                  </span>
                  <button
                    onClick={handleCopyChromeUrl}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-[11px] border border-slate-600 transition-colors shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>
                </div>

                <div className="text-slate-300">
                  B. No canto superior direito da tela de extensões, ative a chave: <strong className="text-amber-400">[x] Modo do desenvolvedor</strong>.
                </div>

                <div className="text-slate-300">
                  C. No canto superior esquerdo, clique no botão <strong className="text-emerald-400">"Carregar sem compactação"</strong> e selecione a pasta extraída no Passo 2.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Sua conta segura: usa sua sessão ativa residencial sem necessidade de fornecer senhas.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onActivateFullAutonomousMode && (
              <button
                onClick={() => {
                  onActivateFullAutonomousMode();
                  onClose();
                }}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Ativar Modo 100% Automático Agora</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
