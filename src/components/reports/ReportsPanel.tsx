import React, { useState } from 'react';
import { CampaignLog, ActiveCampaign } from '../../types';
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Download,
  Trash2,
  Filter,
  ShieldCheck,
  PauseCircle,
  Eye,
  Search,
  Copy,
  Check
} from 'lucide-react';

interface ReportsPanelProps {
  logs: CampaignLog[];
  campaign: ActiveCampaign;
  onClearLogs: () => void;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  logs,
  campaign,
  onClearLogs
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchLog, setSearchLog] = useState<string>('');
  const [inspectLog, setInspectLog] = useState<CampaignLog | null>(null);
  const [copiedInspectText, setCopiedInspectText] = useState<boolean>(false);

  const filteredLogs = logs.filter((log) => {
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    const matchesSearch =
      log.groupName.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.templateTitle.toLowerCase().includes(searchLog.toLowerCase()) ||
      log.details.toLowerCase().includes(searchLog.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalSuccess = logs.filter((l) => l.status === 'success').length;
  const totalBatchPauses = logs.filter((l) => l.status === 'paused_batch').length;
  const totalFailed = logs.filter((l) => l.status === 'failed' || l.status === 'checkpoint_alert').length;

  // Export to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Data/Hora', 'Grupo', 'Template', 'Status', 'Detalhes', 'Link Post'];
    const rows = logs.map((l) => [
      l.timestamp,
      `"${l.groupName.replace(/"/g, '""')}"`,
      `"${l.templateTitle.replace(/"/g, '""')}"`,
      l.status,
      `"${l.details.replace(/"/g, '""')}"`,
      l.postUrl || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_envios_facebook_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Real-time Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Next Dispatch countdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Próximo Disparo</span>
            <p className="text-2xl font-extrabold text-blue-600 font-mono mt-1">
              {campaign.status === 'running'
                ? `${Math.floor(campaign.nextPostCountdown / 60)}m ${campaign.nextPostCountdown % 60}s`
                : '--'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {campaign.status === 'running' ? 'Contagem ativa' : 'Motor parado'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Posts efetuados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Postagens com Sucesso</span>
            <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
              {totalSuccess}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Publicadas no feed do grupo</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Resfriamentos de Lote */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Pausas de Resfriamento</span>
            <p className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">
              {totalBatchPauses}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ciclos anti-ban efetuados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Score de Proteção */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Integridade da Sessão</span>
            <p className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
              {totalFailed === 0 ? '100% Segura' : `${Math.round(100 - (totalFailed / logs.length) * 100)}%`}
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">0 Checkpoints acionados</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Action and Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              onClick={() => setFilterStatus('success')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'success'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sucessos ({totalSuccess})
            </button>
            <button
              onClick={() => setFilterStatus('paused_batch')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'paused_batch'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ciclos Anti-Ban ({totalBatchPauses})
            </button>
            <button
              onClick={() => setFilterStatus('failed')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filterStatus === 'failed'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Falhas / Alertas ({totalFailed})
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar eventos..."
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() => {
              if (confirm('Deseja limpar todos os registros do histórico?')) {
                onClearLogs();
              }
            }}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Horário</th>
                <th className="py-3 px-4">Grupo do Facebook</th>
                <th className="py-3 px-4">Template / Anúncio</th>
                <th className="py-3 px-4">Status & Anti-Ban</th>
                <th className="py-3 px-4">Detalhes da Execução</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Time */}
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* Group */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {log.groupName}
                    </td>

                    {/* Template */}
                    <td className="py-3 px-4 text-slate-700">
                      {log.templateTitle}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.status === 'success' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Publicado
                        </span>
                      )}
                      {log.status === 'paused_batch' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          Pausa Anti-Ban
                        </span>
                      )}
                      {log.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          Falha
                        </span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {log.details}
                    </td>

                    {/* Link / Inspector Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {log.resolvedText && (
                          <button
                            onClick={() => setInspectLog(log)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Ver texto gerado pelo Spintax"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {log.postUrl && (
                          <a
                            href={log.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-medium"
                          >
                            Ver Post
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Nenhum registro encontrado no relatório.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Spintax Content Inspector */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                Auditoria de Variação de Conteúdo (Anti-Bloqueio)
              </h3>
              <button
                onClick={() => setInspectLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-500 uppercase">Grupo Alvo:</span>
                <p className="font-bold text-slate-900 mt-0.5">{inspectLog.groupName}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 uppercase">Texto Único Injetado:</span>
                <div className="mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200 whitespace-pre-line text-slate-800 font-mono text-xs leading-relaxed">
                  {inspectLog.resolvedText}
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                O algoritmo Spintax substitui sinônimos e estruturas dinamicamente a cada postagem, garantindo que o checksum de spam do Facebook considere o post autêntico.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (inspectLog?.resolvedText) {
                    navigator.clipboard.writeText(inspectLog.resolvedText);
                    setCopiedInspectText(true);
                    setTimeout(() => setCopiedInspectText(false), 2000);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
              >
                {copiedInspectText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Texto Gerado
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
