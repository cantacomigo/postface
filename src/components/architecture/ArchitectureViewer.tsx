import React, { useState } from 'react';
import { ARCHITECTURE_FILES, ARCHITECTURE_TREE } from '../../data/architectureDocs';
import {
  Code2,
  FolderTree,
  ShieldCheck,
  Cpu,
  Layers,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Globe,
  Terminal,
  ExternalLink,
  Laptop
} from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const selectedFile = ARCHITECTURE_FILES[selectedFileIndex] || ARCHITECTURE_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([selectedFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-2xl border border-slate-700 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Arquitetura Recomendada: Extensão Chrome (Manifest V3) + React Dashboard
            </h2>
            <p className="text-xs text-slate-300">
              Solução de nível sênior projetada para conformidade estrita com os requisitos de anti-bloqueio e segurança.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4" />
              1. Zero-Knowledge de Senhas
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O sistema <strong>NUNCA</strong> solicita e-mail ou senha do Facebook. Ele opera exclusivamente através dos cookies de sessão nativos (<code className="text-emerald-300 text-[10px]">c_user</code>, <code className="text-emerald-300 text-[10px]">xs</code>) já autenticados pelo usuário na aba aberta.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
              <Laptop className="w-4 h-4" />
              2. Fingerprint Residencial Genuíno
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Diferente de VPS em nuvem (Puppeteer/Playwright bloqueados imediatamente pelo ASN de Datacenter), a extensão roda no IP residencial e hardware real do usuário, passando ilesa pelos filtros heurísticos do Facebook.
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
              <Layers className="w-4 h-4" />
              3. Injeção no Lexical Editor
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              O content script simula eventos sintéticos de digitação humana com velocidade variável (40ms a 120ms por tecla) e curvas de mouse, evitando o sinalizador de colagem em massa.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Architecture Flow Diagram */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" />
          Diagrama de Fluxo dos Componentes
        </h3>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-[700px] text-center">
            {/* Step 1: Web Dashboard */}
            <div className="flex-1 bg-white p-4 rounded-xl border-2 border-blue-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Camada 1: Frontend
              </span>
              <h4 className="font-bold text-slate-900 text-xs">Painel Web (React + Tailwind)</h4>
              <p className="text-[11px] text-slate-500">
                Gerencia templates, grupos, regras anti-ban (delays 120-300s) e monitora em tempo real.
              </p>
            </div>

            <div className="text-blue-500 font-bold flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-mono">postMessage / Bridge</span>
              <span className="text-lg">➔</span>
            </div>

            {/* Step 2: Background Service Worker */}
            <div className="flex-1 bg-white p-4 rounded-xl border-2 border-indigo-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Camada 2: Background
              </span>
              <h4 className="font-bold text-slate-900 text-xs">Service Worker (Manifest V3)</h4>
              <p className="text-[11px] text-slate-500">
                Gerencia a fila de grupos, controla timers por Alarms API, cria abas e despacha ordens.
              </p>
            </div>

            <div className="text-indigo-500 font-bold flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-mono">chrome.tabs.sendMessage</span>
              <span className="text-lg">➔</span>
            </div>

            {/* Step 3: Facebook Web DOM */}
            <div className="flex-1 bg-white p-4 rounded-xl border-2 border-emerald-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Camada 3: Execução
              </span>
              <h4 className="font-bold text-slate-900 text-xs">Aba Ativa do Facebook</h4>
              <p className="text-[11px] text-slate-500">
                Content script injeta o post no editor rico com delay humanizado e valida se o post foi ao ar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Folder Structure & Code Exporter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Folder Structure Tree */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-blue-600" />
              Estrutura de Pastas Sugerida
            </h3>
            <p className="text-xs text-slate-500">
              Organização modular em monorepo com separação estrita entre Painel de Controle e Extensão de Execução.
            </p>

            <pre className="p-3 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
              {ARCHITECTURE_TREE}
            </pre>
          </div>

          {/* Files Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Componentes Funcionais Principais:
            </h4>
            {ARCHITECTURE_FILES.map((file, idx) => (
              <button
                key={file.filename}
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                  selectedFileIndex === idx
                    ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Code2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{file.filename}</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {file.language}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Functional Code Viewer */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            {/* Code header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {selectedFile.path}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedFile.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Código
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar Arquivo
                </button>
              </div>
            </div>

            {/* Code content */}
            <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre">
                {selectedFile.code}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
