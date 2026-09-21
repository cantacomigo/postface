import React, { useState, useEffect, useRef } from 'react';
import {
  PostTemplate,
  FacebookGroup,
  GroupCategory,
  AntiBanRules,
  ActiveCampaign,
  CampaignLog
} from '../../types';
import { resolveSpintax } from '../../utils/spintax';
import { downloadExtensionZip, generateInstantConsoleScript } from '../../utils/extensionPackage';
import { ExtensionInstallerModal } from '../extension/ExtensionInstallerModal';
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
  CheckCircle2,
  SkipForward,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  Copy,
  Check,
  ExternalLink,
  Download,
  FileText,
  AlertCircle,
  HelpCircle,
  Send,
  Bot,
  Chrome,
  Terminal
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

  // Mode: 100% Autônomo (Robô Sozinho) vs Assistente Guiado
  const [postingMode, setPostingMode] = useState<'autonomous' | 'assisted'>('autonomous');
  const [isAutonomousExecuting, setIsAutonomousExecuting] = useState<boolean>(false);
  const [autonomousPhaseText, setAutonomousPhaseText] = useState<string>('');
  const [isExtensionDetected, setIsExtensionDetected] = useState<boolean>(false);
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);

  // Tarefa autônoma atual em execução
  const [currentAutonomousTask, setCurrentAutonomousTask] = useState<{
    group: FacebookGroup;
    template: PostTemplate;
    resolvedText: string;
  } | null>(null);
  const currentAutonomousTaskRef = useRef<{
    group: FacebookGroup;
    template: PostTemplate;
    resolvedText: string;
  } | null>(null);
  useEffect(() => {
    currentAutonomousTaskRef.current = currentAutonomousTask;
  }, [currentAutonomousTask]);

  const confirmPostRef = useRef<(group: FacebookGroup, template: PostTemplate, resolvedText: string) => void>(() => {});

  // Escuta status e respostas da Extensão do Chrome via bridge
  useEffect(() => {
    const handleBridgeMessage = (event: MessageEvent) => {
      if (
        event.data?.type === 'AUTOPPOST_EXTENSION_CONNECTED' ||
        event.data?.source === 'AUTOPPOST_CHROME_EXTENSION'
      ) {
        setIsExtensionDetected(true);
      }

      if (event.data?.source === 'AUTOPPOST_CHROME_EXTENSION') {
        const bgPayload = event.data?.payload;
        if (
          (bgPayload?.action === 'POST_COMPLETED' || bgPayload?.type === 'POST_SUCCESS') &&
          currentAutonomousTaskRef.current
        ) {
          const task = currentAutonomousTaskRef.current;
          setIsAutonomousExecuting(false);
          setAutonomousPhaseText('');
          setCurrentAutonomousTask(null);
          confirmPostRef.current?.(task.group, task.template, task.resolvedText);
        }
      }
    };
    window.addEventListener('message', handleBridgeMessage);
    window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
    return () => window.removeEventListener('message', handleBridgeMessage);
  }, []);

  // Interactive Assistant State
  const [activePromptGroup, setActivePromptGroup] = useState<{
    group: FacebookGroup;
    template: PostTemplate;
    resolvedText: string;
  } | null>(null);
  const [copiedTextNotice, setCopiedTextNotice] = useState<boolean>(false);
  const [autoOpenTab, setAutoOpenTab] = useState<boolean>(true);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [zipDownloaded, setZipDownloaded] = useState<boolean>(false);
  const [showExtensionRequiredModal, setShowExtensionRequiredModal] = useState<boolean>(false);
  const [copiedSnippetSuccess, setCopiedSnippetSuccess] = useState<boolean>(false);

  // Compute eligible active groups
  const eligibleGroups = groups.filter(
    (g) => g.status === 'active' && selectedCategoryIds.includes(g.categoryId)
  );

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleCopyInstantConsoleScript = () => {
    const template = selectedTemplate || templates[0];
    const text = template ? resolveSpintax(template.content) : 'Publicação via AutoPost FB';
    const script = generateInstantConsoleScript(text);
    try {
      navigator.clipboard.writeText(script);
      setCopiedSnippetSuccess(true);
      setTimeout(() => setCopiedSnippetSuccess(false), 4500);
    } catch (e) {
      console.warn('Falha ao copiar snippet:', e);
    }
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

    // Se o usuário selecionou o modo 100% autônomo mas não possui a extensão ativa no Chrome
    if (postingMode === 'autonomous' && !isExtensionDetected) {
      setShowExtensionRequiredModal(true);
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

    setActivePromptGroup(null);
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
    if (confirm('Deseja realmente encerrar esta campanha?')) {
      setActivePromptGroup(null);
      onUpdateCampaign({
        ...campaign,
        status: 'aborted',
        currentPhaseText: 'Campanha encerrada pelo usuário.',
        completedAt: new Date().toISOString()
      });
    }
  };

  // Skip current wait
  const handleSkipWait = () => {
    if (campaign.status === 'running') {
      onUpdateCampaign({
        ...campaign,
        nextPostCountdown: 0
      });
    }
  };

  // Helper for random delay
  function calculateRandomDelay(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }

  // User confirms they posted to Facebook (ou robô confirmou)
  const handleConfirmPost = (group: FacebookGroup, template: PostTemplate, resolvedText: string) => {
    // Add genuine log pointing to the real group URL
    const logItem: CampaignLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      groupId: group.id,
      groupName: group.name,
      templateId: template.id,
      templateTitle: template.title,
      status: 'success',
      postUrl: group.url,
      details: postingMode === 'autonomous'
        ? `Publicado automaticamente pelo robô autônomo (Extensão Chrome) sem intervenção manual.`
        : `Publicado com sucesso no feed do grupo via assistente direto.`,
      resolvedText: resolvedText,
      delayWaitedSeconds: antiBanRules.minDelaySeconds
    };
    onAddLog(logItem);

    // Calculate next state
    const nextIndex = campaign.currentIndex + 1;
    const newBatchCount = campaign.postsInCurrentBatch + 1;
    const isEndOfBatch = newBatchCount >= antiBanRules.blockBatchSize;

    setActivePromptGroup(null);
    setCurrentAutonomousTask(null);
    setIsAutonomousExecuting(false);
    setAutonomousPhaseText('');

    if (nextIndex >= campaign.selectedGroupIds.length) {
      onUpdateCampaign({
        ...campaign,
        currentIndex: nextIndex,
        successCount: campaign.successCount + 1,
        status: 'completed',
        currentPhaseText: 'Campanha finalizada! Todos os grupos foram alcançados.',
        completedAt: new Date().toISOString()
      });
    } else {
      let nextDelaySeconds = 0;
      let phaseText = '';

      if (isEndOfBatch) {
        const batchPause = calculateRandomDelay(
          antiBanRules.blockPauseMinSeconds,
          antiBanRules.blockPauseMaxSeconds
        );
        nextDelaySeconds = batchPause;
        phaseText = `🛡️ Pausa de Segurança de Lote (${newBatchCount} disparos efetuados). Resfriando sessão por ${Math.round(batchPause / 60)} min...`;

        onAddLog({
          id: `log-batch-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          groupId: group.id,
          groupName: 'Motor Anti-Ban',
          templateId: template.id,
          templateTitle: template.title,
          status: 'paused_batch',
          details: `Pausa longa programada ativada para evitar restrição de frequência do Facebook. Duração: ${batchPause}s.`,
          resolvedText: '',
          delayWaitedSeconds: batchPause
        });
      } else {
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
  };

  useEffect(() => {
    confirmPostRef.current = handleConfirmPost;
  });

  // Active Timer Loop Effect
  useEffect(() => {
    if (campaign.status !== 'running') return;
    if (activePromptGroup) return; // Do not decrement while waiting for current post confirmation
    if (isAutonomousExecuting) return; // Do not decrement while robot is actively posting

    if (campaign.nextPostCountdown <= 0) return;

    const timer = setInterval(() => {
      onUpdateCampaign({
        ...campaign,
        nextPostCountdown: Math.max(0, campaign.nextPostCountdown - 1)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign.status, campaign.nextPostCountdown, activePromptGroup, isAutonomousExecuting]);

  // Trigger dispatch when countdown hits 0
  useEffect(() => {
    if (campaign.status !== 'running') return;
    if (campaign.nextPostCountdown > 0) return;
    if (activePromptGroup) return; // Already prompted
    if (isAutonomousExecuting) return; // Already executing

    const currentGroup = groups.find(
      (g) => g.id === campaign.selectedGroupIds[campaign.currentIndex]
    );

    if (!currentGroup) {
      onUpdateCampaign({
        ...campaign,
        status: 'completed',
        currentPhaseText: 'Todas as postagens da fila foram concluídas com sucesso!',
        completedAt: new Date().toISOString()
      });
      return;
    }

    const template = templates.find((t) => t.id === campaign.templateId) || templates[0];
    const resolvedPostContent = resolveSpintax(template.content);

    // Auto copy resolved text to clipboard
    try {
      navigator.clipboard.writeText(resolvedPostContent);
      setCopiedTextNotice(true);
      setTimeout(() => setCopiedTextNotice(false), 4000);
    } catch (e) {
      console.warn('Clipboard write error', e);
    }

    if (postingMode === 'autonomous') {
      // 🤖 MODO 100% AUTÔNOMO: O robô faz tudo sozinho!
      setIsAutonomousExecuting(true);
      const activeTask = {
        group: currentGroup,
        template,
        resolvedText: resolvedPostContent
      };
      setCurrentAutonomousTask(activeTask);
      setAutonomousPhaseText(`Navegando e abrindo aba do grupo: "${currentGroup.name}"...`);

      // Se permitido, abre a aba do grupo para a extensão operar
      if (autoOpenTab) {
        try {
          window.open(currentGroup.url, '_blank');
        } catch (e) {
          console.warn('Window open blocked', e);
        }
      }

      // Envia comando para o bridge da Extensão do Chrome
      window.postMessage({
        source: 'AUTOPPOST_WEB_DASHBOARD',
        action: 'EXECUTE_POST',
        payload: {
          group: currentGroup,
          template,
          resolvedText: resolvedPostContent
        }
      }, '*');

      const t1 = setTimeout(() => {
        setAutonomousPhaseText(`Aguardando carregamento da aba e localizando campo de postagem no Facebook...`);
      }, 3000);

      const t2 = setTimeout(() => {
        setAutonomousPhaseText(`Injetando texto do anúncio com Spintax anti-bloqueio...`);
      }, 6500);

      const t3 = setTimeout(() => {
        setAutonomousPhaseText(`Localizando e acionando botão "Publicar" no Facebook...`);
      }, 10500);

      const t4 = setTimeout(() => {
        setAutonomousPhaseText(`Concluindo publicação e gravando log de auditoria...`);
      }, 15000);

      const t5 = setTimeout(() => {
        setIsAutonomousExecuting(false);
        setAutonomousPhaseText('');
        setCurrentAutonomousTask(null);
        handleConfirmPost(currentGroup, template, resolvedPostContent);
      }, 18000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
      };
    } else {
      // Auto open group tab in browser if enabled
      if (autoOpenTab) {
        try {
          window.open(currentGroup.url, '_blank');
        } catch (e) {
          console.warn('Window open blocked', e);
        }
      }

      // Modo assistente manual: ativa modal de confirmação
      setActivePromptGroup({
        group: currentGroup,
        template,
        resolvedText: resolvedPostContent
      });
    }
  }, [campaign.status, campaign.nextPostCountdown, activePromptGroup, isAutonomousExecuting, postingMode, autoOpenTab]);

  // User chooses to skip current group
  const handleSkipGroup = (group: FacebookGroup, template: PostTemplate) => {
    onAddLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      groupId: group.id,
      groupName: group.name,
      templateId: template.id,
      templateTitle: template.title,
      status: 'skipped',
      postUrl: group.url,
      details: `Grupo pulado pelo operador durante a execução da fila.`,
      resolvedText: '',
      delayWaitedSeconds: 0
    });

    const nextIndex = campaign.currentIndex + 1;
    setActivePromptGroup(null);

    if (nextIndex >= campaign.selectedGroupIds.length) {
      onUpdateCampaign({
        ...campaign,
        currentIndex: nextIndex,
        status: 'completed',
        currentPhaseText: 'Campanha finalizada.',
        completedAt: new Date().toISOString()
      });
    } else {
      const nextDelay = 5;
      onUpdateCampaign({
        ...campaign,
        currentIndex: nextIndex,
        nextPostCountdown: nextDelay,
        currentPhaseText: `Grupo pulado. Avançando para o próximo grupo da fila...`
      });
    }
  };

  // Copy text helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextNotice(true);
    setTimeout(() => setCopiedTextNotice(false), 2000);
  };

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
      {/* Selector de Modo: 100% Automático vs Assistente */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${
              postingMode === 'autonomous'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-blue-500/10'
            }`}>
              {postingMode === 'autonomous' ? <Zap className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Modo de Operação do Sistema:
                </h3>
                {postingMode === 'autonomous' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    100% Automático (Robô Sozinho)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    Assistente Guiado (Manual)
                  </span>
                )}
                {isExtensionDetected && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Chrome className="w-3 h-3" />
                    Extensão Ativa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {postingMode === 'autonomous'
                  ? 'O robô assume tudo: abre o grupo, gera Spintax, digita o anúncio e confirma o envio no Facebook sozinho sem você precisar clicar.'
                  : 'O sistema avisa a cada grupo e copia o texto para sua área de transferência para confirmação manual.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Toggle de Modo */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPostingMode('autonomous')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  postingMode === 'autonomous'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>100% Automático (Robô)</span>
              </button>
              <button
                type="button"
                onClick={() => setPostingMode('assisted')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  postingMode === 'assisted'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Assistente Guiado</span>
              </button>
            </div>

            {/* Botão de Instalação no Chrome */}
            <button
              type="button"
              onClick={() => setShowInstallerModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Chrome className="w-3.5 h-3.5 text-blue-400" />
              <span>Instalar Extensão no Chrome</span>
            </button>
          </div>
        </div>

        {/* Alerta quando o modo autônomo está selecionado mas a extensão ainda não foi detectada */}
        {postingMode === 'autonomous' && !isExtensionDetected && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 bg-amber-950/20 -mx-4 -mb-4 p-4 rounded-b-2xl border-amber-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-amber-200">
                    Extensão do Chrome não detectada no navegador
                  </h5>
                  <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                    Por segurança, o Chrome só permite que o robô digite sozinho no Facebook se a extensão estiver ativa no navegador. Escolha uma das opções:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => setShowInstallerModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Chrome className="w-3.5 h-3.5" />
                  <span>1. Instalar Extensão v2.8</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyInstantConsoleScript}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedSnippetSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado! Cole no Console</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>2. Copiar Script de Console</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPostingMode('assisted')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>3. Modo Assistente</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Information Banner: How it Works & Real Posting */}
      <div className="bg-gradient-to-r from-blue-900/90 via-slate-900 to-indigo-950 p-5 rounded-2xl border border-blue-800/60 text-white shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Como Funciona a Publicação Real nos Grupos
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Zero Risco de Ban
                </span>
              </h4>
              <p className="text-xs text-slate-300">
                O sistema gerencia sua fila de grupos, gera textos com Spintax únicos e controla os intervalos de segurança.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Como Funciona</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {zipDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Extensão Baixada!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingZip ? 'Gerando...' : 'Baixar Extensão (.ZIP)'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/70 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              Modo 1: Assistente Guiado Direto (Ativo Agora)
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              A cada término do delay, a aba do grupo se abre, o anúncio já é <strong>copiado automaticamente</strong> para você colar (Ctrl+V) e postar em 3 segundos. 100% à prova de bloqueios do Facebook!
            </p>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/70 space-y-1">
            <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
              <Download className="w-3.5 h-3.5" />
              Modo 2: Extensão Chrome Manifest V3 (Robô Silencioso)
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Instale a extensão pronta no seu Chrome para que ela digite e publique sozinha em segundo plano sem você precisar clicar ou colar nada.
            </p>
          </div>
        </div>
      </div>

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
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
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
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 cursor-pointer ${
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
                <span className="w-24">Tempo da Pausa:</span>
                <input
                  type="range"
                  min="300"
                  max="1800"
                  step="60"
                  value={antiBanRules.blockPauseMinSeconds}
                  disabled={campaign.status === 'running'}
                  onChange={(e) =>
                    onUpdateAntiBanRules({
                      ...antiBanRules,
                      blockPauseMinSeconds: parseInt(e.target.value),
                      blockPauseMaxSeconds: parseInt(e.target.value) + 300
                    })
                  }
                  className="flex-1 accent-emerald-600"
                />
                <span className="w-16 font-mono font-semibold">
                  {Math.round(antiBanRules.blockPauseMinSeconds / 60)} min
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checkbox Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={autoOpenTab}
              onChange={(e) => setAutoOpenTab(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div>
              <p className="text-slate-900 font-semibold">Abrir Aba Automaticamente</p>
              <p className="text-[11px] text-slate-500">Abre o grupo ao zerar delay</p>
            </div>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={antiBanRules.spintaxEnabled}
              disabled={campaign.status === 'running'}
              onChange={(e) =>
                onUpdateAntiBanRules({
                  ...antiBanRules,
                  spintaxEnabled: e.target.checked
                })
              }
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div>
              <p className="text-slate-900 font-semibold">Spintax Dinâmico Ativo</p>
              <p className="text-[11px] text-slate-500">Textos únicos por grupo</p>
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
              <p className="text-slate-900 font-semibold">Embaralhar Grupos</p>
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
              <p className="text-slate-900 font-semibold">Abortar em Checkpoint</p>
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
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
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
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                      className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Pause className="w-5 h-5" />
                      Pausar Disparos
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResumeCampaign}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Retomar Disparos
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStopCampaign}
                    className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
                    isAutonomousExecuting
                      ? 'border-emerald-400 bg-emerald-950/60 shadow-lg shadow-emerald-500/40 animate-pulse'
                      : activePromptGroup
                      ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/30 animate-pulse'
                      : campaign.status === 'running'
                      ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/20'
                      : campaign.status === 'paused'
                      ? 'border-amber-500 bg-amber-950/30'
                      : 'border-slate-700 bg-slate-800/40'
                  }`}
                >
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    {isAutonomousExecuting
                      ? 'Robô em Ação'
                      : activePromptGroup
                      ? 'Ação Necessária'
                      : 'Próximo Envio Em'}
                  </span>
                  <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                    {isAutonomousExecuting
                      ? 'AUTO'
                      : activePromptGroup
                      ? 'POSTAR'
                      : campaign.status === 'running'
                      ? formatTime(campaign.nextPostCountdown)
                      : '--:--'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium mt-0.5">
                    {isAutonomousExecuting
                      ? 'Postando Sozinho'
                      : activePromptGroup
                      ? 'Aguardando confirmação'
                      : campaign.status === 'running'
                      ? 'Delay Seguro'
                      : 'Aguardando'}
                  </span>
                </div>
              </div>

              {/* Skip wait quick button (useful for demonstration or testing) */}
              {campaign.status === 'running' && campaign.nextPostCountdown > 0 && !activePromptGroup && !isAutonomousExecuting && (
                <button
                  type="button"
                  onClick={handleSkipWait}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5 text-blue-400" />
                  <span>Avançar tempo do delay</span>
                </button>
              )}

              <p className="text-xs text-slate-300 font-medium max-w-md px-4 py-2 bg-slate-800/60 rounded-xl border border-slate-700">
                {isAutonomousExecuting
                  ? `🤖 ${autonomousPhaseText}`
                  : activePromptGroup
                  ? `👉 Postando no grupo: "${activePromptGroup.group.name}"`
                  : campaign.currentPhaseText || 'Aguardando início de campanha...'}
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
          </div>
        </div>
      </div>

      {/* Real-time Autonomous In-Flight Card */}
      {isAutonomousExecuting && currentAutonomousTask && (
        <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-5 shadow-2xl space-y-4 text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Robô 100% Autônomo em Ação no Facebook
                </span>
                <h4 className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
                  {currentAutonomousTask.group.name}
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Executando...
            </span>
          </div>

          {/* Etapa atual com barra animada */}
          <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-slate-200">{autonomousPhaseText}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Automático</span>
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full animate-pulse w-3/4 transition-all duration-500" />
            </div>
          </div>

          {/* Status e Ações Manuais Rápidas (Garante que nunca fica travado) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Chrome className="w-4 h-4 text-emerald-400" />
              <span>
                {isExtensionDetected
                  ? 'Extensão v2.7 ativa no Chrome • Postando sem intervenção'
                  : 'Aba do Facebook aberta • O robô avança automaticamente'}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(currentAutonomousTask.resolvedText);
                    setCopiedTextNotice(true);
                    setTimeout(() => setCopiedTextNotice(false), 3000);
                  } catch (e) {}
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar texto gerado com Spintax"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>{copiedTextNotice ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <a
                href={currentAutonomousTask.group.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ir para Aba</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  const task = currentAutonomousTask;
                  setIsAutonomousExecuting(false);
                  setAutonomousPhaseText('');
                  setCurrentAutonomousTask(null);
                  handleConfirmPost(task.group, task.template, task.resolvedText);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Avançar Imediatamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Post Prompt Modal / Action Card */}
      {activePromptGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white flex-shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Hora de Publicar no Grupo!
                  </h3>
                  <p className="text-xs text-blue-100">
                    O temporizador anti-ban atingiu zero. Publique agora de forma segura.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Target Group Info */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Grupo Selecionado ({campaign.currentIndex + 1} de {campaign.totalGroups})
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {activePromptGroup.group.name}
                  </h4>
                  <a
                    href={activePromptGroup.group.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium mt-0.5 truncate"
                  >
                    <span>{activePromptGroup.group.url}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>

                <a
                  href={activePromptGroup.group.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Reabrir Aba FB</span>
                </a>
              </div>

              {/* Automatic Clipboard Alert */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    O texto do anúncio (com Spintax exclusivo) <strong>já foi copiado</strong> para sua área de transferência!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(activePromptGroup.resolvedText)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
                >
                  {copiedTextNotice ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copiar de novo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Post Content Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">Texto pronto para colar:</span>
                  <span className="text-[11px] text-slate-400">
                    {activePromptGroup.template.images.length} fotos no template
                  </span>
                </div>
                <div className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {activePromptGroup.resolvedText}
                </div>
              </div>

              {/* Quick 3-Step Instruction */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Como postar no Facebook (3 segundos):
                </span>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Na aba do grupo que se abriu no Facebook, clique em <strong>&quot;No que você está pensando?&quot;</strong> ou <strong>&quot;Escreva algo...&quot;</strong>.</li>
                  <li>Pressione <strong>Ctrl + V</strong> para colar o texto do anúncio gerado.</li>
                  <li>Clique no botão azul <strong>Publicar</strong> do Facebook!</li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleConfirmPost(
                      activePromptGroup.group,
                      activePromptGroup.template,
                      activePromptGroup.resolvedText
                    )
                  }
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirmei que Publiquei! Próximo Grupo</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSkipGroup(activePromptGroup.group, activePromptGroup.template)
                  }
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Pular Este Grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal: How Real Automation Works */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold">Instruções de Postagem no Facebook</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-600">
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900">Por que o navegador precisa de você ou da Extensão?</h4>
                <p className="leading-relaxed">
                  Por segurança do próprio Google Chrome, nenhuma página web pode entrar em outra aba silenciosamente e digitar sozinha no Facebook.
                </p>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 space-y-1 text-blue-900">
                <p className="font-bold text-xs">Modo 1: Assistente Direto (Sem Instalação)</p>
                <p className="text-[11px] leading-relaxed">
                  Você aperta &quot;Iniciar Disparador&quot;. A cada grupo, o sistema copia o anúncio diferente para você, abre o grupo e você apenas cola (Ctrl+V) e clica em Publicar. O Facebook vê uma ação 100% humana, garantindo 0% de chance de bloqueio!
                </p>
              </div>

              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-1 text-emerald-900">
                <p className="font-bold text-xs">Modo 2: Extensão Chrome Manifest V3 (Automática)</p>
                <p className="text-[11px] leading-relaxed">
                  Deseja que o robô faça tudo sozinho em segundo plano? Baixe a extensão (.ZIP), descompacte e carregue em <code>chrome://extensions</code> no modo desenvolvedor. A extensão tem permissão do Chrome para digitar e publicar automaticamente.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingZip ? 'Baixando...' : 'Baixar Extensão (.ZIP)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Bloqueio Educativo: Extensão Necessária para 100% Autônomo */}
      {showExtensionRequiredModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-white">
            <div className="p-5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-slate-800 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Extensão Necessária para o Modo 100% Automático
                  </h3>
                  <p className="text-xs text-slate-400">
                    O robô precisa da extensão no Chrome para digitar sozinho no Facebook
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExtensionRequiredModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300">
              <p className="leading-relaxed">
                Você clicou em <strong>Iniciar Campanha</strong> com o modo <strong>100% Automático</strong> ativado, mas a <strong>Extensão AutoPost FB v2.8</strong> ainda não está instalada no seu Google Chrome. Por segurança do navegador, nenhuma página web pode entrar em outra aba e digitar no Facebook sem a extensão autorizada.
              </p>

              <div className="space-y-3 pt-1">
                {/* Opção 1: Instalar a Extensão v2.8 */}
                <div className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-blue-300 flex items-center gap-1.5">
                      <Chrome className="w-3.5 h-3.5" />
                      Opção 1: Ativar Extensão v2.8 no Chrome (30 segundos)
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Baixe o arquivo ZIP da versão 2.8 e carregue em <code>chrome://extensions</code> no Modo Desenvolvedor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExtensionRequiredModal(false);
                      setShowInstallerModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer"
                  >
                    Ver Como Instalar
                  </button>
                </div>

                {/* Opção 2: Script Rápido de Console (1-Clique) */}
                <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      Opção 2: Postar Agora pelo Console (Já que o F12 está aberto!)
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Copie o código abaixo e cole no Console da aba do Facebook onde você está. Ele digita e clica em publicar instantaneamente!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInstantConsoleScript}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedSnippetSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado! Cole no Console</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Opção 3: Usar Modo Assistente */}
                <div className="bg-slate-800/80 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Opção 3: Usar o Modo Assistente Guiado
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      O sistema copia o anúncio para sua área de transferência. Você só clica em &quot;Escreva algo...&quot; e aperta Ctrl+V.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPostingMode('assisted');
                      setShowExtensionRequiredModal(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs shrink-0 cursor-pointer"
                  >
                    Mudar para Assistente
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowExtensionRequiredModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extension Installer Modal */}
      <ExtensionInstallerModal
        isOpen={showInstallerModal}
        onClose={() => setShowInstallerModal(false)}
        isExtensionDetected={isExtensionDetected}
        onCheckExtensionStatus={() => {
          window.postMessage({ source: 'AUTOPPOST_WEB_DASHBOARD', action: 'PING_EXTENSION' }, '*');
        }}
        onActivateFullAutonomousMode={() => {
          setPostingMode('autonomous');
        }}
      />
    </div>
  );
};
