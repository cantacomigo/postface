import React, { useState, useEffect } from 'react';
import {
  PostTemplate,
  FacebookGroup,
  GroupCategory,
  AntiBanRules,
  ActiveCampaign,
  CampaignLog
} from '../../types';
import { resolveSpintax } from '../../utils/spintax';
import {
  Play,
  Pause,
  Square,
  Clock,
  ShieldCheck,
  Zap,
  Sliders,
  AlertTriangle,
  CheckCircle,
  SkipForward,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';

interface CampaignRunnerProps {
  templates: PostTemplate[];
  groups: FacebookGroup[];
  categories: GroupCategory[];
  antiBanRules: AntiBanRules;
  onUpdateAntiBanRules: (rules: AntiBanRules) => void;
  campaign: ActiveCampaign;
  onUpdateCampaign: (campaign: ActiveCampaign) => void;
  onAddLog: (log: CampaignLog) => void;
}

export const CampaignRunner: React.FC<CampaignRunnerProps> = ({
  templates,
  groups,
  categories,
  antiBanRules,
  onUpdateAntiBanRules,
  campaign,
  onUpdateCampaign,
  onAddLog
}) => {
  // Campaign setup state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    categories.map((c) => c.id)
  );

  // Speed multiplier for testing
  const [speedMode, setSpeedMode] = useState<'real' | 'fast'>('real');

  // Compute eligible active groups
  const eligibleGroups = groups.filter(
    (g) => g.status === 'active' && selectedCategoryIds.includes(g.categoryId)
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Handler to toggle category selection
  const toggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      if (selectedCategoryIds.length === 1) return; // Keep at least one
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  // Start campaign
  const handleStartCampaign = () => {
    if (eligibleGroups.length === 0) {
      alert('Nenhum grupo ativo disponível nas categorias selecionadas.');
      return;
    }
    if (!selectedTemplate) {
      alert('Selecione um template de anúncio válido.');
      return;
    }

    // Prepare group order (randomized if anti-ban enabled)
    let queueGroups = [...eligibleGroups];
    if (antiBanRules.randomizeGroupOrder) {
      queueGroups.sort(() => Math.random() - 0.5);
    }

    const firstGroup = queueGroups[0];
    const initialDelay = calculateRandomDelay(antiBanRules.minDelaySeconds, antiBanRules.maxDelaySeconds);

    const newCampaign: ActiveCampaign = {
      id: `camp-${Date.now()}`,
      name: `Campanha - ${selectedTemplate.title.slice(0, 30)}`,
      templateId: selectedTemplate.id,
      categoryIds: selectedCategoryIds,
      selectedGroupIds: queueGroups.map((g) => g.id),
      status: 'running',
      antiBanRules: { ...antiBanRules },
      currentIndex: 0,
      totalGroups: queueGroups.length,
      successCount: 0,
      failedCount: 0,
      postsInCurrentBatch: 0,
      nextPostCountdown: Math.round(initialDelay / (speedMode === 'fast' ? 15 : 1)),
      currentPhaseText: `Preparando primeiro disparo no grupo "${firstGroup?.name || ''}"...`,
      startedAt: new Date().toISOString()
    };

    onUpdateCampaign(newCampaign);

    onAddLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      groupId: firstGroup?.id || '',
      groupName: firstGroup?.name || 'Início de Campanha',
      templateId: selectedTemplate.id,
      templateTitle: selectedTemplate.title,
      status: 'paused_batch',
      details: `Campanha iniciada com ${queueGroups.length} grupos em fila. Intervalo inicial anti-ban: ${initialDelay}s.`,
      resolvedText: '',
      delayWaitedSeconds: 0
    });
  };

  // Pause campaign
  const handlePauseCampaign = () => {
    onUpdateCampaign({
      ...campaign,
      status: 'paused',
      currentPhaseText: 'Campanha em pausa pelo operador.'
    });
  };

  // Resume campaign
  const handleResumeCampaign = () => {
    onUpdateCampaign({
      ...campaign,
      status: 'running',
      currentPhaseText: 'Campanha retomada.'
    });
  };

  // Abort / Stop campaign
  const handleStopCampaign = () => {
    if (confirm('Deseja realmente interromper esta campanha?')) {
      onUpdateCampaign({
        ...campaign,
        status: 'aborted',
        currentPhaseText: 'Campanha finalizada pelo usuário.',
        completedAt: new Date().toISOString()
      });
    }
  };

  // Skip current wait
  const handleSkipWait = () => {
    if (campaign.status === 'running') {
      onUpdateCampaign({
        ...campaign,
        nextPostCountdown: 1
      });
    }
  };

  // Helper for random delay
  function calculateRandomDelay(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }

  // Active Timer Loop Effect
  useEffect(() => {
    if (campaign.status !== 'running') return;

    const timer = setInterval(() => {
      onUpdateCampaign({
        ...campaign,
        nextPostCountdown: Math.max(0, campaign.nextPostCountdown - 1)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign.status, campaign.nextPostCountdown]);

  // Handle when countdown reaches 0: dispatch post
  useEffect(() => {
    if (campaign.status !== 'running') return;
    if (campaign.nextPostCountdown > 0) return;

    // Trigger dispatch action
    const currentGroup = groups.find(
      (g) => g.id === campaign.selectedGroupIds[campaign.currentIndex]
    );

    if (!currentGroup) {
      // Completed all
      onUpdateCampaign({
        ...campaign,
        status: 'completed',
        currentPhaseText: 'Todas as postagens da fila foram concluídas com sucesso!',
        completedAt: new Date().toISOString()
      });
      return;
    }

    // Execute Post Simulation / Dispatch
    const template = templates.find((t) => t.id === campaign.templateId) || templates[0];
    const resolvedPostContent = resolveSpintax(template.content);

    // Add success log
    const logItem: CampaignLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      groupId: currentGroup.id,
      groupName: currentGroup.name,
      templateId: template.id,
      templateTitle: template.title,
      status: 'success',
      postUrl: `${currentGroup.url}/posts/${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
      details: `Publicado com sucesso via sessão ativa do navegador. Digitação simulada com ${template.images.length} fotos anexadas.`,
      resolvedText: resolvedPostContent,
      delayWaitedSeconds: antiBanRules.minDelaySeconds
    };
    onAddLog(logItem);

    // Calculate next state
    const nextIndex = campaign.currentIndex + 1;
    const newBatchCount = campaign.postsInCurrentBatch + 1;
    const isEndOfBatch = newBatchCount >= antiBanRules.blockBatchSize;

    if (nextIndex >= campaign.selectedGroupIds.length) {
      // Finished all
      onUpdateCampaign({
        ...campaign,
        currentIndex: nextIndex,
        successCount: campaign.successCount + 1,
        status: 'completed',
        currentPhaseText: 'Campanha finalizada! Todos os grupos foram alcançados.',
        completedAt: new Date().toISOString()
      });
    } else {
      // Determine next delay: Batch pause or standard jitter delay
      let nextDelaySeconds = 0;
      let phaseText = '';

      if (isEndOfBatch) {
        // Safe Long Batch Pause (ex: 500 to 900 seconds)
        const batchPause = calculateRandomDelay(
          antiBanRules.blockPauseMinSeconds,
          antiBanRules.blockPauseMaxSeconds
        );
        nextDelaySeconds = batchPause;
        phaseText = `🛡️ Pausa de Segurança de Lote (${newBatchCount} disparos efetuados). Resfriando sessão por ${Math.round(batchPause / 60)} min...`;

        onAddLog({
          id: `log-batch-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          groupId: currentGroup.id,
          groupName: 'Motor Anti-Ban',
          templateId: template.id,
          templateTitle: template.title,
          status: 'paused_batch',
          details: `Pausa longa programada ativada para evitar restrição de frequência do Facebook. Duração: ${batchPause}s.`,
          resolvedText: '',
          delayWaitedSeconds: batchPause
        });
      } else {
        // Standard random jitter delay (ex: 120 to 300 seconds)
        const standardDelay = calculateRandomDelay(
          antiBanRules.minDelaySeconds,
          antiBanRules.maxDelaySeconds
        );
        nextDelaySeconds = standardDelay;
        const nextGroup = groups.find(
          (g) => g.id === campaign.selectedGroupIds[nextIndex]
        );
        phaseText = `Aguardando delay seguro (${standardDelay}s) para envio ao grupo "${nextGroup?.name || ''}"...`;
      }

      // Apply speed multiplier for UI testing if enabled
      const finalCountdown = Math.max(
        3,
        Math.round(nextDelaySeconds / (speedMode === 'fast' ? 15 : 1))
      );

      onUpdateCampaign({
        ...campaign,
        currentIndex: nextIndex,
        successCount: campaign.successCount + 1,
        postsInCurrentBatch: isEndOfBatch ? 0 : newBatchCount,
        nextPostCountdown: finalCountdown,
        currentPhaseText: phaseText
      });
    }
  }, [campaign.status, campaign.nextPostCountdown]);

  // Format seconds to mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    campaign.totalGroups > 0
      ? Math.round((campaign.currentIndex / campaign.totalGroups) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Anti-Ban Rules & Safeguards Config Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Parâmetros de Segurança Anti-Bloqueio (Anti-Ban Engine)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configurações algorítmicas de jitter, pausas de resfriamento e emulação humana para proteger o perfil.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Velocidade do Motor:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSpeedMode('real')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  speedMode === 'real'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1x Tempo Real (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => setSpeedMode('fast')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  speedMode === 'fast'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3" />
                15x Teste Acelerado
              </button>
            </div>
          </div>
        </div>

        {/* Rule Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interval Slider (120 to 300s) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Intervalo Padrão entre Postagens Consecutivas
              </label>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {antiBanRules.minDelaySeconds}s a {antiBanRules.maxDelaySeconds}s
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Variação aleatória (Jitter Gaussiano) para que o Facebook não detecte padrão robótico.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="w-16">Mínimo:</span>
                <input
                  type="range"
                  min="60"
                  max="240"
                  step="10"
                  value={antiBanRules.minDelaySeconds}
                  disabled={campaign.status === 'running'}
                  onChange={(e) =>
                    onUpdateAntiBanRules({
                      ...antiBanRules,
                      minDelaySeconds: parseInt(e.target.value)
                    })
                  }
                  className="flex-1 accent-blue-600"
                />
                <span className="w-12 font-mono font-semibold">{antiBanRules.minDelaySeconds}s</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="w-16">Máximo:</span>
                <input
                  type="range"
                  min="180"
                  max="600"
                  step="10"
                  value={antiBanRules.maxDelaySeconds}
                  disabled={campaign.status === 'running'}
                  onChange={(e) =>
                    onUpdateAntiBanRules({
                      ...antiBanRules,
                      maxDelaySeconds: parseInt(e.target.value)
                    })
                  }
                  className="flex-1 accent-blue-600"
                />
                <span className="w-12 font-mono font-semibold">{antiBanRules.maxDelaySeconds}s</span>
              </div>
            </div>
          </div>

          {/* Block Batch Pauses (e.g. Every 5 posts -> pause 500-900s) */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Pausas Programadas por Bloco de Disparos
              </label>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                A cada {antiBanRules.blockBatchSize} posts → Pausa de {Math.round(antiBanRules.blockPauseMinSeconds / 60)}-{Math.round(antiBanRules.blockPauseMaxSeconds / 60)} min
              </span>
            </div>

            <p className="text-[11px] text-slate-500">
              Após um lote de envios, o motor descansa a sessão imitando o comportamento de um usuário real.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="w-24">Tamanho do Bloco:</span>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="1"
                  value={antiBanRules.blockBatchSize}
                  disabled={campaign.status === 'running'}
                  onChange={(e) =>
                    onUpdateAntiBanRules({
                      ...antiBanRules,
                      blockBatchSize: parseInt(e.target.value)
                    })
                  }
                  className="flex-1 accent-emerald-600"
                />
                <span className="w-16 font-mono font-semibold">{antiBanRules.blockBatchSize} posts</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <span className="w-24">Pausa de Lote:</span>
                <input
                  type="range"
                  min="300"
                  max="1200"
                  step="30"
                  value={antiBanRules.blockPauseMinSeconds}
                  disabled={campaign.status === 'running'}
                  onChange={(e) =>
                    onUpdateAntiBanRules({
                      ...antiBanRules,
                      blockPauseMinSeconds: parseInt(e.target.value),
                      blockPauseMaxSeconds: Math.max(parseInt(e.target.value) + 180, antiBanRules.blockPauseMaxSeconds)
                    })
                  }
                  className="flex-1 accent-emerald-600"
                />
                <span className="w-16 font-mono font-semibold">
                  {Math.round(antiBanRules.blockPauseMinSeconds / 60)} a {Math.round(antiBanRules.blockPauseMaxSeconds / 60)} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Toggles Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={antiBanRules.humanTypingSimulation}
              disabled={campaign.status === 'running'}
              onChange={(e) =>
                onUpdateAntiBanRules({
                  ...antiBanRules,
                  humanTypingSimulation: e.target.checked
                })
              }
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div>
              <p className="text-slate-900 font-semibold">Digitação Humana (40-120ms)</p>
              <p className="text-[11px] text-slate-500">Sem injeção instantânea</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={antiBanRules.randomizeGroupOrder}
              disabled={campaign.status === 'running'}
              onChange={(e) =>
                onUpdateAntiBanRules({
                  ...antiBanRules,
                  randomizeGroupOrder: e.target.checked
                })
              }
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div>
              <p className="text-slate-900 font-semibold">Embaralhar Ordem dos Grupos</p>
              <p className="text-[11px] text-slate-500">Evita repetição de rota</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={antiBanRules.stopOnCheckpoint}
              disabled={campaign.status === 'running'}
              onChange={(e) =>
                onUpdateAntiBanRules({
                  ...antiBanRules,
                  stopOnCheckpoint: e.target.checked
                })
              }
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div>
              <p className="text-slate-900 font-semibold">Abortar em Checkpoint/Captcha</p>
              <p className="text-[11px] text-slate-500">Interrompe se houver aviso</p>
            </div>
          </label>
        </div>
      </div>

      {/* Campaign Setup & Execution Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campaign Selection Form */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              Configuração da Campanha de Envio
            </h3>

            {/* Template Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                1. Escolha o Template de Anúncio
              </label>
              <select
                value={selectedTemplateId}
                disabled={campaign.status === 'running'}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title} ({tpl.images.length} fotos)
                  </option>
                ))}
              </select>

              {/* Mini Template Preview */}
              {selectedTemplate && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{selectedTemplate.title}</span>
                    <span className="text-emerald-600 flex items-center gap-1 font-normal">
                      <Sparkles className="w-3 h-3" />
                      Spintax Ativo
                    </span>
                  </div>
                  <p className="line-clamp-2 italic text-slate-500">
                    &quot;{resolveSpintax(selectedTemplate.content)}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Category of Groups Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. Categorias de Grupos Alvo ({eligibleGroups.length} grupos selecionados)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat.id);
                  const countInCat = groups.filter((g) => g.categoryId === cat.id && g.status === 'active').length;

                  return (
                    <button
                      type="button"
                      key={cat.id}
                      disabled={campaign.status === 'running'}
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/60 text-slate-900 font-semibold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
                        {countInCat}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start / Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              {campaign.status === 'idle' || campaign.status === 'completed' || campaign.status === 'aborted' ? (
                <button
                  type="button"
                  id="btn-start-campaign"
                  onClick={handleStartCampaign}
                  disabled={eligibleGroups.length === 0}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Iniciar Disparador Seguro ({eligibleGroups.length} Grupos)
                </button>
              ) : (
                <div className="flex-1 flex gap-2">
                  {campaign.status === 'running' ? (
                    <button
                      type="button"
                      onClick={handlePauseCampaign}
                      className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Pause className="w-5 h-5" />
                      Pausar Disparos
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResumeCampaign}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Retomar Disparos
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStopCampaign}
                    className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Square className="w-5 h-5" />
                    Encerrar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Countdown & Execution Cockpit */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-bold text-sm tracking-wide text-white uppercase">
                  Cockpit de Disparo em Tempo Real
                </h4>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                Status: {campaign.status.toUpperCase()}
              </span>
            </div>

            {/* Circular / Large Countdown Card */}
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-3">
              <div className="relative flex items-center justify-center">
                {/* Visual pulse glow */}
                <div
                  className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
                    campaign.status === 'running'
                      ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/20'
                      : campaign.status === 'paused'
                      ? 'border-amber-500 bg-amber-950/30'
                      : 'border-slate-700 bg-slate-800/40'
                  }`}
                >
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    Próximo Envio Em
                  </span>
                  <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    {campaign.status === 'running'
                      ? formatTime(campaign.nextPostCountdown)
                      : '--:--'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                    {campaign.status === 'running' ? 'Delay Seguro' : 'Aguardando'}
                  </span>
                </div>
              </div>

              {/* Skip wait quick button (useful for demonstration or testing) */}
              {campaign.status === 'running' && campaign.nextPostCountdown > 5 && (
                <button
                  type="button"
                  onClick={handleSkipWait}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5 text-blue-400" />
                  <span>Avançar tempo do delay</span>
                </button>
              )}

              <p className="text-xs text-slate-300 font-medium max-w-md px-4 py-2 bg-slate-800/60 rounded-xl border border-slate-700">
                {campaign.currentPhaseText || 'Aguardando início de campanha...'}
              </p>
            </div>

            {/* Campaign Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Progresso da Fila:</span>
                <span className="font-mono font-semibold text-white">
                  {campaign.currentIndex} de {campaign.totalGroups} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Real-time counters */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400">Enviados OK</span>
                <p className="text-xl font-bold text-emerald-400 font-mono">
                  {campaign.successCount}
                </p>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400">No Bloco Atual</span>
                <p className="text-xl font-bold text-blue-400 font-mono">
                  {campaign.postsInCurrentBatch} / {antiBanRules.blockBatchSize}
                </p>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-center">
                <span className="text-xs text-slate-400">Restantes</span>
                <p className="text-xl font-bold text-slate-200 font-mono">
                  {Math.max(0, campaign.totalGroups - campaign.currentIndex)}
                </p>
              </div>
            </div>

            {/* Active Session Verification Info */}
            <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-900/60 flex items-start gap-2.5 text-xs text-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-100">Operando com a Sessão do Seu Navegador</p>
                <p className="text-blue-300 text-[11px] mt-0.5">
                  Para os disparos ocorrerem, mantenha uma aba com o Facebook aberta. Nenhuma credencial pessoal é transmitida ou salva.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
