import React from 'react';
import { 
  X, 
  Download, 
  FolderArchive, 
  ToggleRight, 
  FolderCheck, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface ExtensionInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadZip: () => void;
  isDownloadingZip?: boolean;
}

export const ExtensionInstallerModal: React.FC<ExtensionInstallerModalProps> = ({
  isOpen,
  onClose,
  onDownloadZip,
  isDownloadingZip = false,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: '1',
      title: 'Baixar e Extrair o Pacote',
      description: 'Clique no botão abaixo para baixar o arquivo ZIP da extensão e extraia-o em uma pasta fácil de encontrar no seu computador (por exemplo: Documentos/AutoPost-FB).',
      icon: FolderArchive,
    },
    {
      step: '2',
      title: 'Acessar chrome://extensions',
      description: 'No Google Chrome, Brave ou Edge, digite chrome://extensions na barra de endereços (ou abra Menu > Extensões > Gerenciar Extensões).',
      icon: ExternalLink,
    },
    {
      step: '3',
      title: 'Ativar o "Modo do Desenvolvedor"',
      description: 'No canto superior direito da página de extensões, ative a chave "Modo do desenvolvedor" (Developer mode).',
      icon: ToggleRight,
    },
    {
      step: '4',
      title: 'Carregar sem compactação',
      description: 'Clique no botão "Carregar sem compactação" (Load unpacked) no topo esquerdo e selecione a pasta onde você descompactou os arquivos (onde está o manifest.json).',
      icon: FolderCheck,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Como Instalar a Extensão no Navegador</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Guia rápido em 4 passos simples para ativar a automação anti-bloqueio
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {steps.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" />
                    {s.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{s.description}</p>
                </div>
              </div>
            );
          })}

          {/* Guarantee banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-300 leading-relaxed">
              <strong>Blindagem Anti-Triplicação Ativa:</strong> Esta versão v2.4.1 já inclui a correção completa que impede que o texto das Polpas De Marchi ou qualquer mensagem seja enviada 3 vezes.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition order-2 sm:order-1"
          >
            Fechar Janela
          </button>

          <button
            onClick={onDownloadZip}
            disabled={isDownloadingZip}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition flex items-center justify-center gap-2 order-1 sm:order-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Extensão (.ZIP) Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
