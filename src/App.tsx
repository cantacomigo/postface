import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TemplateManager } from './components/templates/TemplateManager';
import { GroupManager } from './components/groups/GroupManager';
import { CampaignRunner } from './components/campaign/CampaignRunner';
import { ReportsPanel } from './components/reports/ReportsPanel';
import { ArchitectureViewer } from './components/architecture/ArchitectureViewer';
import { ChromePopupSimulator } from './components/extension/ChromePopupSimulator';
import {
  PostTemplate,
  FacebookGroup,
  GroupCategory,
  AntiBanRules,
  ActiveCampaign,
  CampaignLog
} from './types';
import {
  loadStoredData,
  saveStoredData
} from './utils/storage';
import { Shield, CheckCircle, Info } from 'lucide-react';

export default function App() {
  // Load initial states from local storage or defaults
  const initialData = loadStoredData();

  const [activeTab, setActiveTab] = useState<
    'campaign' | 'templates' | 'groups' | 'reports' | 'architecture' | 'extension_popup'
  >('campaign');

  const [templates, setTemplates] = useState<PostTemplate[]>(initialData.templates);
  const [categories, setCategories] = useState<GroupCategory[]>(initialData.categories);
  const [groups, setGroups] = useState<FacebookGroup[]>(initialData.groups);
  const [antiBanRules, setAntiBanRules] = useState<AntiBanRules>(initialData.rules);
  const [logs, setLogs] = useState<CampaignLog[]>(initialData.logs);

  const [campaign, setCampaign] = useState<ActiveCampaign>({
    id: 'camp-default',
    name: 'Campanha de Divulgação Segura',
    templateId: initialData.templates[0]?.id || '',
    categoryIds: initialData.categories.map((c: GroupCategory) => c.id),
    selectedGroupIds: initialData.groups.map((g: FacebookGroup) => g.id),
    status: 'idle',
    antiBanRules: initialData.rules,
    currentIndex: 0,
    totalGroups: initialData.groups.length,
    successCount: 0,
    failedCount: 0,
    postsInCurrentBatch: 0,
    nextPostCountdown: 0,
    currentPhaseText: 'Pronto para iniciar. Configure o template e os grupos desejados.'
  });

  // Sync to local storage
  useEffect(() => {
    saveStoredData('TEMPLATES', templates);
  }, [templates]);

  useEffect(() => {
    saveStoredData('CATEGORIES', categories);
  }, [categories]);

  useEffect(() => {
    saveStoredData('GROUPS', groups);
  }, [groups]);

  useEffect(() => {
    saveStoredData('RULES', antiBanRules);
  }, [antiBanRules]);

  useEffect(() => {
    saveStoredData('LOGS', logs);
  }, [logs]);

  // Listener para sincronização automática via Extensão Chrome ou Script de Console
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        (event.data?.type === 'FB_AUTOPAGE_SYNC_GROUPS' || event.data?.type === 'FB_SYNC_GROUPS_RESULT') &&
        Array.isArray(event.data.groups)
      ) {
        handleBulkAddGroups(event.data.groups);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handlers for templates
  const handleSaveTemplate = (tpl: PostTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === tpl.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = tpl;
        return next;
      }
      return [tpl, ...prev];
    });
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // Handlers for groups
  const handleSaveGroup = (grp: FacebookGroup) => {
    setGroups((prev) => {
      const idx = prev.findIndex((g) => g.id === grp.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = grp;
        return next;
      }
      return [grp, ...prev];
    });
  };

  const handleDeleteGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const handleBulkAddGroups = (newGroups: FacebookGroup[]) => {
    setGroups((prev) => [...newGroups, ...prev]);
  };

  // Handlers for categories
  const handleSaveCategory = (cat: GroupCategory) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [...prev, cat];
    });
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Handlers for logs
  const handleAddLog = (log: CampaignLog) => {
    setLogs((prev) => [log, ...prev]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRunning={campaign.status === 'running'}
        totalLogs={logs.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'campaign' && (
          <CampaignRunner
            templates={templates}
            groups={groups}
            categories={categories}
            antiBanRules={antiBanRules}
            onUpdateAntiBanRules={setAntiBanRules}
            campaign={campaign}
            onUpdateCampaign={setCampaign}
            onAddLog={handleAddLog}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateManager
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}

        {activeTab === 'groups' && (
          <GroupManager
            groups={groups}
            categories={categories}
            onSaveGroup={handleSaveGroup}
            onDeleteGroup={handleDeleteGroup}
            onBulkAddGroups={handleBulkAddGroups}
            onSaveCategory={handleSaveCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel
            logs={logs}
            campaign={campaign}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureViewer />
        )}

        {activeTab === 'extension_popup' && (
          <ChromePopupSimulator
            templates={templates}
            groups={groups}
            categories={categories}
            antiBanRules={antiBanRules}
            campaign={campaign}
            logs={logs}
            onStartCampaign={(tplId, catId) => {
              const targetTemplateId = tplId || campaign.templateId || templates[0]?.id;
              const targetGroups = groups.filter((g) => {
                const matchesActive = g.status === 'active';
                const matchesCategory = !catId || catId === 'all' || g.categoryId === catId;
                return matchesActive && matchesCategory;
              });

              if (targetGroups.length === 0) {
                alert('Nenhum grupo ativo disponível com os filtros selecionados.');
                return;
              }

              const selectedTpl = templates.find((t) => t.id === targetTemplateId) || templates[0];

              setCampaign({
                ...campaign,
                status: 'running',
                templateId: targetTemplateId,
                selectedGroupIds: targetGroups.map((g) => g.id),
                totalGroups: targetGroups.length,
                currentIndex: 0,
                successCount: 0,
                failedCount: 0,
                postsInCurrentBatch: 0,
                nextPostCountdown: 12,
                currentPhaseText: `Iniciando disparo com o primeiro grupo: "${targetGroups[0]?.name}"...`
              });

              handleAddLog({
                id: `log-${Date.now()}`,
                timestamp: new Date().toLocaleTimeString('pt-BR'),
                groupId: targetGroups[0]?.id || '',
                groupName: targetGroups[0]?.name || 'Início via Popup',
                templateId: selectedTpl.id,
                templateTitle: selectedTpl.title,
                status: 'paused_batch',
                details: `Disparo acionado via Popup da Extensão com ${targetGroups.length} grupos em fila.`,
                resolvedText: '',
                delayWaitedSeconds: 0
              });
            }}
            onPauseCampaign={() => {
              setCampaign((prev) => ({
                ...prev,
                status: 'paused',
                currentPhaseText: 'Pausado via popup da extensão.'
              }));
            }}
            onResumeCampaign={() => {
              setCampaign((prev) => ({
                ...prev,
                status: 'running',
                currentPhaseText: 'Retomado via popup da extensão.'
              }));
            }}
            onStopCampaign={() => {
              setCampaign((prev) => ({
                ...prev,
                status: 'aborted',
                currentPhaseText: 'Campanha finalizada via popup da extensão.',
                completedAt: new Date().toISOString()
              }));
            }}
            onSkipWait={() => {
              setCampaign((prev) => ({
                ...prev,
                nextPostCountdown: 1
              }));
            }}
            onSelectTemplate={(tplId) => {
              setCampaign((prev) => ({
                ...prev,
                templateId: tplId
              }));
            }}
            onOpenFullDashboard={() => setActiveTab('campaign')}
          />
        )}
      </main>

      {/* System Status Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>
              Arquitetura Segura Anti-Ban: Operando via Sessão Ativa do Navegador (Zero Credenciais Armazenadas)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Delay: {antiBanRules.minDelaySeconds}s-{antiBanRules.maxDelaySeconds}s</span>
            <span>•</span>
            <span>Pausas: Cada {antiBanRules.blockBatchSize} posts</span>
            <span>•</span>
            <span>Spintax Ativado</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
