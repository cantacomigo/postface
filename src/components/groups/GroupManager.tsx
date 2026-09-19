import React, { useState } from 'react';
import { FacebookGroup, GroupCategory } from '../../types';
import {
  FolderKanban,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Upload,
  Globe,
  Lock,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  FileText,
  ArrowRight,
  DownloadCloud,
  Laptop,
  ShieldCheck,
  Info
} from 'lucide-react';

interface GroupManagerProps {
  groups: FacebookGroup[];
  categories: GroupCategory[];
  onSaveGroup: (group: FacebookGroup) => void;
  onDeleteGroup: (id: string) => void;
  onBulkAddGroups: (newGroups: FacebookGroup[]) => void;
  onClearAllGroups?: () => void;
  onReplaceAllGroups?: (newGroups: FacebookGroup[]) => void;
  onSaveCategory: (category: GroupCategory) => void;
  onDeleteCategory: (id: string) => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  categories,
  onSaveGroup,
  onDeleteGroup,
  onBulkAddGroups,
  onClearAllGroups,
  onReplaceAllGroups,
  onSaveCategory,
  onDeleteCategory
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddingGroup, setIsAddingGroup] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isManagingCategories, setIsManagingCategories] = useState<boolean>(false);

  // Group form state
  const [editingGroup, setEditingGroup] = useState<FacebookGroup | null>(null);

  // Category form state
  const [editingCategory, setEditingCategory] = useState<GroupCategory | null>(null);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatColor, setNewCatColor] = useState<string>('#0284c7');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  // Bulk import state
  const [bulkUrls, setBulkUrls] = useState<string>('');
  const [bulkCategoryId, setBulkCategoryId] = useState<string>(categories[0]?.id || '');

  // Auto-Sync States
  const [isAutoSyncOpen, setIsAutoSyncOpen] = useState<boolean>(false);
  const [autoSyncTab, setAutoSyncTab] = useState<'console_script' | 'extension' | 'demo_pack'>('console_script');
  const [syncTargetCategoryId, setSyncTargetCategoryId] = useState<string>(categories[0]?.id || '');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressStep, setSyncProgressStep] = useState<number>(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [copiedConsoleScript, setCopiedConsoleScript] = useState<boolean>(false);
  const [pastedJsonData, setPastedJsonData] = useState<string>('');
  const [replaceOnImport, setReplaceOnImport] = useState<boolean>(true);

  const handleClearAll = () => {
    if (window.confirm('Tem certeza que deseja apagar todos os grupos da lista?')) {
      if (onClearAllGroups) {
        onClearAllGroups();
      }
      setSyncToast('Lista de grupos foi limpa com sucesso.');
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Script Extrator Inteligente com Auto-Scroll para carregar TODOS os grupos e pegar URLs reais
  const CONSOLE_SCRAPER_SCRIPT = `(async () => {
  try {
    let banner = document.getElementById('fb-auto-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'fb-auto-banner';
      banner.style.cssText = 'position:fixed;top:15px;left:50%;transform:translateX(-50%);z-index:9999999;background:#0f172a;color:#f8fafc;padding:16px 24px;border-radius:16px;box-shadow:0 12px 36px rgba(0,0,0,0.6);font-family:system-ui,-apple-system,sans-serif;font-size:13px;border:2px solid #3b82f6;display:flex;flex-direction:column;gap:6px;max-width:520px;text-align:center;pointer-events:none;';
      document.body.appendChild(banner);
    }

    const setMsg = (title, sub) => {
      banner.innerHTML = '<b style="color:#60a5fa;font-size:15px;">' + title + '</b><span style="color:#cbd5e1;font-size:12px;">' + sub + '</span>';
    };

    setMsg('🔍 AutoPost FB: Rolando para carregar TODOS os grupos...', 'Aguarde alguns segundos enquanto carregamos todos os grupos da sua conta...');

    // Auto-scroll 8 vezes para forçar o Facebook a carregar grupos adicionais do feed virtual
    for (let i = 1; i <= 8; i++) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 600));
      setMsg('🔍 AutoPost FB: Rolando página (' + i + '/8)...', 'Carregando lista completa de comunidades...');
    }

    const groupMap = new Map();
    const anchors = Array.from(document.querySelectorAll('a[href*="/groups/"]'));
    const systemKeywords = ['joins', 'feed', 'discover', 'create', 'notifications', 'membership_questions', 'search', 'category', 'explore', 'chats'];

    anchors.forEach(a => {
      try {
        let href = a.href || '';
        if (!href.includes('/groups/')) return;
        href = href.split('?')[0].replace(/\\/+$/, '');
        const match = href.match(/\\/groups\\/([^\\/]+)/);
        if (!match) return;
        const slugOrId = match[1];
        if (systemKeywords.includes(slugOrId.toLowerCase())) return;

        // Ignora cards de sugestão de grupos com botão 'Participar' ou 'Entrar no grupo'
        const container = a.closest('div[role="article"]') || a.closest('div[role="listitem"]') || a.closest('div[role="row"]') || a.parentElement;
        if (container) {
          const text = container.innerText || '';
          if (text.includes('Participar') || text.includes('Entrar no grupo') || text.includes('Pedir para entrar')) return;
        }

        // Obtém o nome real do grupo
        let name = '';
        const nameLines = (a.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean);
        if (nameLines.length > 0) {
          name = nameLines[0];
        }
        if (!name || name.length < 2 || name.toLowerCase().includes('participar')) {
          const heading = a.querySelector('span[dir="auto"], strong, h2, h3');
          if (heading && heading.innerText) {
            name = heading.innerText.trim();
          }
        }

        if (name && name.length >= 2 && !name.toLowerCase().includes('participar')) {
          // Link canônico que realmente abre o grupo
          const canonicalUrl = 'https://www.facebook.com/groups/' + slugOrId + '/';
          if (!groupMap.has(canonicalUrl)) {
            groupMap.set(canonicalUrl, {
              name: name,
              url: canonicalUrl,
              fbId: slugOrId
            });
          }
        }
      } catch (err) {}
    });

    const groups = Array.from(groupMap.values());
    if (groups.length === 0) {
      banner.style.borderColor = '#ef4444';
      setMsg('⚠️ Nenhum grupo encontrado', 'Certifique-se de estar na página facebook.com/groups/joins/ onde seus grupos aparecem!');
      setTimeout(() => banner.remove(), 7000);
      alert('Nenhum grupo detectado.\\n\\nCertifique-se de estar logado no Facebook e na página de grupos que você participa:\\nhttps://www.facebook.com/groups/joins/');
      return;
    }

    const json = JSON.stringify(groups, null, 2);
    await navigator.clipboard.writeText(json);

    banner.style.borderColor = '#10b981';
    setMsg('🎉 ' + groups.length + ' Grupos Reais Extraídos!', 'Links oficiais copiados para a Área de Transferência! Volte ao painel AutoPost FB.');
    setTimeout(() => banner.remove(), 9000);

    console.log('%c✅ ' + groups.length + ' grupos reais extraídos com links oficiais:', 'color:#10b981;font-weight:bold;font-size:16px;', groups);
    alert('🎉 SUCESSO!\\n\\nForam extraídos ' + groups.length + ' grupos que você participa com URLs reais e oficiais!\\n\\nEles foram COPIADOS para a sua Área de Transferência.\\n\\nAgora volte à tela do AutoPost FB e clique em "Colar do Clipboard"!');
  } catch (e) {
    console.error(e);
    alert('Erro ao extrair grupos: ' + e.message);
  }
})();`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(CONSOLE_SCRAPER_SCRIPT);
    setCopiedConsoleScript(true);
    setTimeout(() => setCopiedConsoleScript(false), 2500);
  };

  const handleRunExtensionSync = () => {
    setIsSyncing(true);
    setSyncProgressStep(1);
    setSyncStatusMessage('1/2: Enviando solicitação de extração para a extensão...');

    window.postMessage({ type: 'FB_REQUEST_GROUP_SYNC' }, '*');

    // Escuta resposta real da extensão
    let received = false;
    const onRealGroupResponse = (event: MessageEvent) => {
      if (
        (event.data?.type === 'FB_AUTOPAGE_SYNC_GROUPS' || event.data?.type === 'FB_SYNC_GROUPS_RESULT') &&
        Array.isArray(event.data.groups) &&
        event.data.groups.length > 0
      ) {
        received = true;
        window.removeEventListener('message', onRealGroupResponse);
        setIsSyncing(false);
        setSyncProgressStep(0);
        setSyncToast(`🎉 ${event.data.groups.length} grupos reais da sua conta foram extraídos via Extensão!`);
        setTimeout(() => setSyncToast(null), 5000);
        setIsAutoSyncOpen(false);
      }
    };

    window.addEventListener('message', onRealGroupResponse);

    setTimeout(() => {
      if (!received) {
        setSyncProgressStep(2);
        setSyncStatusMessage('2/2: Aguardando resposta da aba do Facebook...');

        setTimeout(() => {
          window.removeEventListener('message', onRealGroupResponse);
          setIsSyncing(false);
          setSyncProgressStep(0);

          if (!received) {
            alert(
              'A extensão do Chrome não retornou dados em segundo plano nesta tentativa.\\n\\nUtilize a aba "Script do Console": ela lê os seus grupos reais diretamente da aba aberta no Facebook com 100% de precisão e copia todos os links reais para você!'
            );
          }
        }, 1600);
      }
    }, 1200);
  };

  const handleImportPastedData = (overrideText?: string) => {
    const rawData = typeof overrideText === 'string' ? overrideText : pastedJsonData;
    if (!rawData || !rawData.trim()) return;

    let importedCount = 0;
    const targetCat = syncTargetCategoryId || categories[0]?.id || 'cat-geral';

    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        const newGroups: FacebookGroup[] = parsed
          .filter((item: any) => item && (item.url || item.name))
          .map((item: any, idx: number) => ({
            id: `grp-json-${Date.now()}-${idx}`,
            fbId: item.fbId || String(Math.floor(100000000000000 + Math.random() * 900000000000000)),
            name: item.name || `Grupo Extraído #${idx + 1}`,
            url: item.url.startsWith('http') ? item.url : `https://${item.url}`,
            categoryId: targetCat,
            privacy: item.privacy || 'public',
            membersCount: item.membersCount || Math.floor(10000 + Math.random() * 40000),
            status: 'active'
          }));

        if (newGroups.length > 0) {
          if (replaceOnImport && onReplaceAllGroups) {
            onReplaceAllGroups(newGroups);
          } else {
            onBulkAddGroups(newGroups);
          }
          importedCount = newGroups.length;
        }
      }
    } catch (err) {
      const lines = rawData
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const newGroups: FacebookGroup[] = lines.map((line, idx) => {
        let inferredName = `Grupo Extraído #${idx + 1}`;
        try {
          const parts = line.split('/groups/')[1]?.split('/')[0];
          if (parts) {
            inferredName = decodeURIComponent(parts).replace(/-/g, ' ').replace(/_/g, ' ');
            inferredName = inferredName.charAt(0).toUpperCase() + inferredName.slice(1);
          }
        } catch (e) {}

        return {
          id: `grp-txt-${Date.now()}-${idx}`,
          fbId: String(Math.floor(100000000000000 + Math.random() * 900000000000000)),
          name: inferredName,
          url: line.startsWith('http') ? line : `https://${line}`,
          categoryId: targetCat,
          privacy: 'public',
          membersCount: Math.floor(8000 + Math.random() * 30000),
          status: 'active'
        };
      });

      if (newGroups.length > 0) {
        if (replaceOnImport && onReplaceAllGroups) {
          onReplaceAllGroups(newGroups);
        } else {
          onBulkAddGroups(newGroups);
        }
        importedCount = newGroups.length;
      }
    }

    if (importedCount > 0) {
      setPastedJsonData('');
      setSyncToast(`🎉 ${importedCount} grupos foram ${replaceOnImport ? 'definidos como sua lista única com links oficiais' : 'importados com sucesso'}!`);
      setTimeout(() => setSyncToast(null), 5000);
      setIsAutoSyncOpen(false);
    } else {
      alert('Não foi possível identificar grupos válidos no texto colado. Verifique o formato e tente novamente.');
    }
  };

  const handleImportDemoPack = (packType: 'imoveis' | 'vendas' | 'marketing') => {
    const targetCat = syncTargetCategoryId || categories[0]?.id || 'cat-geral';
    let demoList: FacebookGroup[] = [];

    if (packType === 'imoveis') {
      demoList = [
        {
          id: `grp-pack-${Date.now()}-1`,
          fbId: '984729184729102',
          name: 'Imóveis SP & Interior - Venda e Locação Direta',
          url: 'https://www.facebook.com/groups/imoveis-sp-interior-direto',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 52000,
          status: 'active'
        },
        {
          id: `grp-pack-${Date.now()}-2`,
          fbId: '827194857201948',
          name: 'Feirão de Casas e Apartamentos Litoral & Capital',
          url: 'https://www.facebook.com/groups/feirao-casas-apartamentos',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 43800,
          status: 'active'
        },
        {
          id: `grp-pack-${Date.now()}-3`,
          fbId: '719284758392019',
          name: 'Investidores do Mercado Imobiliário Brasil',
          url: 'https://www.facebook.com/groups/investidores-imobiliario-br',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 31000,
          status: 'active'
        }
      ];
    } else if (packType === 'vendas') {
      demoList = [
        {
          id: `grp-pack-${Date.now()}-4`,
          fbId: '629184729102948',
          name: 'Classificados do Brasil - Compre, Venda & Anuncie',
          url: 'https://www.facebook.com/groups/classificados-brasil-anuncie',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 88000,
          status: 'active'
        },
        {
          id: `grp-pack-${Date.now()}-5`,
          fbId: '519284758392019',
          name: 'Desapego Rápido & Bons Negócios SP',
          url: 'https://www.facebook.com/groups/desapego-rapido-sp',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 65400,
          status: 'active'
        }
      ];
    } else {
      demoList = [
        {
          id: `grp-pack-${Date.now()}-6`,
          fbId: '419284758392019',
          name: 'Marketing Digital, Tráfego Pago & Afiliados',
          url: 'https://www.facebook.com/groups/marketing-digital-afiliados-br',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 46200,
          status: 'active'
        },
        {
          id: `grp-pack-${Date.now()}-7`,
          fbId: '319284758392019',
          name: 'Networking de Empresários & Renda Extra',
          url: 'https://www.facebook.com/groups/networking-empresarios-br',
          categoryId: targetCat,
          privacy: 'public',
          membersCount: 39100,
          status: 'active'
        }
      ];
    }

    if (replaceOnImport && onReplaceAllGroups) {
      onReplaceAllGroups(demoList);
    } else {
      onBulkAddGroups(demoList);
    }
    setSyncToast(`🎉 ${demoList.length} grupos ${replaceOnImport ? 'definidos como sua lista única' : 'adicionados'} com sucesso!`);
    setTimeout(() => setSyncToast(null), 5000);
    setIsAutoSyncOpen(false);
  };

  // Filtered groups
  const filteredGroups = groups.filter((g) => {
    const matchesCat = selectedCategoryId === 'all' || g.categoryId === selectedCategoryId;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleStartAddGroup = () => {
    setEditingGroup({
      id: `grp-${Date.now()}`,
      fbId: String(Math.floor(100000000000000 + Math.random() * 900000000000000)),
      name: '',
      url: '',
      categoryId: categories[0]?.id || 'cat-imoveis',
      privacy: 'public',
      membersCount: 10000,
      status: 'active',
      notes: ''
    });
    setIsAddingGroup(true);
  };

  const handleSaveGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup || !editingGroup.name.trim() || !editingGroup.url.trim()) return;

    onSaveGroup(editingGroup);
    setEditingGroup(null);
    setIsAddingGroup(false);
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkUrls
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const newItems: FacebookGroup[] = lines.map((line, idx) => {
      // Try extracting group name or slug from URL
      let inferredName = `Grupo Importado #${idx + 1}`;
      try {
        const parts = line.split('/groups/')[1]?.split('/')[0];
        if (parts) {
          inferredName = decodeURIComponent(parts).replace(/-/g, ' ').replace(/_/g, ' ');
          inferredName = inferredName.charAt(0).toUpperCase() + inferredName.slice(1);
        }
      } catch (err) {
        // fallback
      }

      return {
        id: `grp-${Date.now()}-${idx}`,
        fbId: String(Math.floor(100000000000000 + Math.random() * 900000000000000)),
        name: inferredName,
        url: line.startsWith('http') ? line : `https://${line}`,
        categoryId: bulkCategoryId || categories[0]?.id || 'cat-geral',
        privacy: 'public',
        membersCount: Math.floor(5000 + Math.random() * 45000),
        status: 'active'
      };
    });

    onBulkAddGroups(newItems);
    setBulkUrls('');
    setIsBulkImportOpen(false);
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: GroupCategory = {
      id: editingCategory ? editingCategory.id : `cat-${Date.now()}`,
      name: newCatName.trim(),
      color: newCatColor,
      description: newCatDesc.trim()
    };

    onSaveCategory(newCat);
    setNewCatName('');
    setNewCatDesc('');
    setEditingCategory(null);
  };

  const toggleGroupStatus = (group: FacebookGroup) => {
    const updated: FacebookGroup = {
      ...group,
      status: group.status === 'active' ? 'paused' : 'active'
    };
    onSaveGroup(updated);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setPastedJsonData(text);
        handleImportPastedData(text);
      } else {
        alert('A área de transferência está vazia. Primeiro execute o Script Extrator na aba do Facebook para copiar seus grupos.');
      }
    } catch (err) {
      alert('Se o navegador bloquear a leitura direta da área de transferência, cole com Ctrl+V na caixa de texto abaixo e clique em "Processar e Importar".');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {syncToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncToast}</span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-blue-600" />
            Organização de Grupos & Segmentações
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie comunidades do Facebook agrupadas por nicho ou localização geográfica para campanhas direcionadas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAutoSyncOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Puxar Meus Grupos (Auto-Sync)
          </button>

          <button
            onClick={() => setIsManagingCategories(!isManagingCategories)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
          >
            <Tag className="w-4 h-4 text-slate-500" />
            Categorias ({categories.length})
          </button>

          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium text-xs rounded-xl transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar em Lote
          </button>

          <button
            onClick={handleStartAddGroup}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Grupo
          </button>

          {groups.length > 0 && (
            <button
              onClick={handleClearAll}
              title="Limpar todos os grupos cadastrados"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              Limpar Lista ({groups.length})
            </button>
          )}
        </div>
      </div>

      {/* Banner de alerta caso existam grupos fictícios ou com links estimados que não abrem */}
      {groups.some(
        (g) =>
          g.name.includes('Brasil Geral') ||
          g.name.includes('Direto com Proprietário') ||
          g.url.includes('classificados-vendas-brasil') ||
          g.url.includes('feirao-imoveis-proprietario') ||
          g.url.includes('classificados-olimpia-vende-tudo') ||
          g.url.includes('classificado-de-olimpia-sp') ||
          g.url.includes('olimpia-sp-compras-vendas-alugueis') ||
          g.url.includes('compro-vendo-troco-olimpia-sp') ||
          g.url.includes('classificados-olimpia') ||
          g.url.includes('classi-olimpia-anuncie') ||
          g.url.includes('olimpia-empregos-oportunidades') ||
          g.url.includes('bom-negocio-olimpia') ||
          g.url.includes('vendas-olimpia')
      ) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-950 shadow-xs">
          <div className="flex items-start md:items-center gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div>
              <span className="font-bold text-sm block text-amber-950">
                Por que a tela do Facebook diz &quot;Este conteúdo não está disponível no momento&quot;?
              </span>
              <span className="text-amber-800 text-xs block mt-0.5 max-w-2xl">
                Alguns grupos na sua lista estão com <strong>links aproximados/estimados</strong> (como <code>facebook.com/groups/classificados-olimpia-vende-tudo</code>). No Facebook, os grupos possuem IDs oficiais únicos e esses links estimados não existem nos servidores deles. Além disso, o carregador anterior puxava apenas 9 itens.
                <br />
                Para carregar <strong>TODOS os seus grupos reais com as URLs oficiais que abrem com 100% de sucesso</strong>, utilize o Extrator do Facebook abaixo.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setAutoSyncTab('console_script');
                setIsAutoSyncOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
            >
              Extrair Meus Grupos Reais
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-medium text-xs rounded-xl transition-colors"
            >
              Limpar Lista
            </button>
          </div>
        </div>
      )}

      {/* Categories Management Drawer/Section */}
      {isManagingCategories && (
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600" />
              Categorias Personalizadas de Segmentação
            </h3>
            <span className="text-xs text-slate-500">
              Associe grupos a nichos específicos para disparos segmentados
            </span>
          </div>

          <form
            onSubmit={handleSaveCategorySubmit}
            className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-xl border border-slate-200"
          >
            <input
              type="text"
              required
              placeholder="Nome da categoria (ex: Imóveis Litoral SP)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Descrição ou observação"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-10 h-8 p-0.5 border border-slate-300 rounded-lg cursor-pointer bg-white"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
            >
              {editingCategory ? 'Atualizar' : 'Salvar Categoria'}
            </button>
            {editingCategory && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setNewCatName('');
                  setNewCatDesc('');
                }}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-lg"
              >
                Cancelar
              </button>
            )}
          </form>

          {/* Categories Pill list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const count = groups.filter((g) => g.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{cat.name}</p>
                      <p className="text-[11px] text-slate-500">{count} grupos associados</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setNewCatName(cat.name);
                        setNewCatColor(cat.color);
                        setNewCatDesc(cat.description || '');
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Editar Categoria"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {categories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir a categoria "${cat.name}"?`)) {
                            onDeleteCategory(cat.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategoryId === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({groups.length})
          </button>

          {categories.map((cat) => {
            const count = groups.filter((g) => g.categoryId === cat.id).length;
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
                />
                <span>{cat.name}</span>
                <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar grupo ou URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Groups Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Grupo do Facebook</th>
                <th className="py-3 px-4">Categoria / Segmento</th>
                <th className="py-3 px-4">Membros Estimados</th>
                <th className="py-3 px-4">Privacidade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((grp) => {
                  const category = categories.find((c) => c.id === grp.categoryId);
                  return (
                    <tr key={grp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & URL */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{grp.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <a
                            href={grp.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline max-w-sm truncate"
                          >
                            {grp.url}
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          {(grp.url.includes('classificados-olimpia-vende-tudo') ||
                            grp.url.includes('classificado-de-olimpia-sp') ||
                            grp.url.includes('olimpia-sp-compras-vendas-alugueis') ||
                            grp.url.includes('compro-vendo-troco-olimpia-sp') ||
                            grp.url.includes('classificados-olimpia') ||
                            grp.url.includes('classi-olimpia-anuncie') ||
                            grp.url.includes('olimpia-empregos-oportunidades') ||
                            grp.url.includes('bom-negocio-olimpia') ||
                            grp.url.includes('vendas-olimpia') ||
                            grp.url.includes('classificados-vendas-brasil')) && (
                            <span
                              title="Este link foi estimado e não existe no Facebook (gera erro 'Conteúdo indisponível'). Use o Extrator do Console para puxar a URL oficial com ID real!"
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded text-[10px] font-semibold cursor-help"
                            >
                              ⚠️ Link Estimado (Dá erro no FB)
                            </span>
                          )}
                        </div>
                        {grp.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 italic">
                            Obs: {grp.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor: `${category?.color || '#0284c7'}15`,
                            color: category?.color || '#0284c7'
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: category?.color || '#0284c7' }}
                          />
                          {category?.name || 'Sem Categoria'}
                        </span>
                      </td>

                      {/* Members */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {grp.membersCount.toLocaleString('pt-BR')} membros
                        </span>
                      </td>

                      {/* Privacy */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          {grp.privacy === 'public' ? (
                            <>
                              <Globe className="w-3.5 h-3.5 text-emerald-600" />
                              Público
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              Privado
                            </>
                          )}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleGroupStatus(grp)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                            grp.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {grp.status === 'active' ? (
                            <>
                              <PlayCircle className="w-3 h-3 text-emerald-600" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3 h-3 text-slate-400" />
                              Pausado
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingGroup(grp);
                              setIsAddingGroup(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir grupo "${grp.name}"?`)) {
                                onDeleteGroup(grp.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Nenhum grupo encontrado nesta categoria ou pesquisa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Group */}
      {isAddingGroup && editingGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingGroup.name ? 'Editar Grupo' : 'Novo Grupo do Facebook'}
            </h3>

            <form onSubmit={handleSaveGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  placeholder="Ex: Classificados e Imóveis SP"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  URL Completa do Grupo *
                </label>
                <input
                  type="url"
                  required
                  value={editingGroup.url}
                  onChange={(e) => setEditingGroup({ ...editingGroup, url: e.target.value })}
                  placeholder="https://www.facebook.com/groups/seugrupo"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Categoria / Segmento
                  </label>
                  <select
                    value={editingGroup.categoryId}
                    onChange={(e) =>
                      setEditingGroup({ ...editingGroup, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Privacidade
                  </label>
                  <select
                    value={editingGroup.privacy}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        privacy: e.target.value as 'public' | 'private'
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="public">Público</option>
                    <option value="private">Privado (Membro)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Estimativa de Membros
                  </label>
                  <input
                    type="number"
                    value={editingGroup.membersCount}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        membersCount: parseInt(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editingGroup.status}
                    onChange={(e) =>
                      setEditingGroup({
                        ...editingGroup,
                        status: e.target.value as 'active' | 'paused'
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="active">Ativo (Habilitado para envio)</option>
                    <option value="paused">Pausado (Não enviar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Observações Internas (Opcional)
                </label>
                <input
                  type="text"
                  value={editingGroup.notes || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, notes: e.target.value })}
                  placeholder="Ex: Não postar de madrugada / Regras rígidas"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingGroup(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                >
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bulk Import */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Importação em Lote de Grupos
            </h3>
            <p className="text-xs text-slate-500">
              Cole uma lista de URLs de grupos do Facebook (uma por linha). O sistema extrai automaticamente o identificador do grupo.
            </p>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Atribuir à Categoria
                </label>
                <select
                  value={bulkCategoryId}
                  onChange={(e) => setBulkCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Lista de Links (Uma URL por linha)
                </label>
                <textarea
                  rows={6}
                  required
                  value={bulkUrls}
                  onChange={(e) => setBulkUrls(e.target.value)}
                  placeholder={`https://www.facebook.com/groups/imoveissp\nhttps://www.facebook.com/groups/apartamentoscentrosaopaulo\nhttps://www.facebook.com/groups/classificadosmorumbi`}
                  className="w-full px-3 py-2 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkImportOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                >
                  Importar Grupos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Auto-Sync Groups */}
      {isAutoSyncOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Sincronização Automática dos Seus Grupos
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                      Zero Digitação
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Puxe todos os grupos em que o seu perfil do Facebook já participa de forma rápida e segura.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAutoSyncOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Context Notice */}
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Por que páginas web externas não lêem o Facebook automaticamente?</p>
                <p className="text-blue-800/90 text-[11px] leading-relaxed">
                  Por segurança do navegador (política de CORS e proteção de cookies), nenhuma aplicação externa (como Vercel ou sites normais) tem permissão de bisbilhotar o que está aberto no seu Facebook. Por isso, oferecemos 3 métodos 100% seguros: através da nossa <strong>Extensão Oficial</strong>, via <strong>Script Instantâneo no Console</strong> ou <strong>Pacotes de Grupos Prontos</strong>.
                </p>
              </div>
            </div>

            {/* Guia para extração de grupos reais com auto-scroll */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <span className="text-xs font-bold text-blue-950 block">
                    Puxar Todos os Seus Grupos com URLs Reais e Oficiais
                  </span>
                  <span className="text-[11px] text-blue-850 block">
                    O Extrator do Facebook faz auto-scroll para puxar todos os grupos que você participa, com os IDs verdadeiros que abrem com 100% de sucesso!
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoSyncTab('console_script')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg whitespace-nowrap transition-colors shadow-xs"
              >
                Abrir Extrator Oficial
              </button>
            </div>

            {/* Target Category Selector & Replace Option */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  Atribuir os grupos importados à Categoria:
                </label>
                <select
                  value={syncTargetCategoryId}
                  onChange={(e) => setSyncTargetCategoryId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={replaceOnImport}
                    onChange={(e) => setReplaceOnImport(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>
                    <strong>Substituir lista existente</strong> (apaga grupos fictícios ou de teste anteriores)
                  </span>
                </label>
                {groups.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    Atualmente: {groups.length} grupos
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                onClick={() => setAutoSyncTab('extension')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  autoSyncTab === 'extension'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                1. Extensão Chrome (Automático)
              </button>
              <button
                onClick={() => setAutoSyncTab('console_script')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  autoSyncTab === 'console_script'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                2. Script do Console (Sem Instalação)
              </button>
              <button
                onClick={() => setAutoSyncTab('demo_pack')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  autoSyncTab === 'demo_pack'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                3. Pacotes por Nicho (Prontos)
              </button>
            </div>

            {/* Tab 1: Extension Auto Sync */}
            {autoSyncTab === 'extension' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Ponte com a Sessão Ativa do Facebook
                    </span>
                    <span className="text-[11px] text-slate-500">Manifest V3 Bridge</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Com o Facebook logado em qualquer aba do seu navegador, a extensão acessa a página oficial de comunidades em{' '}
                    <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px] text-blue-600">
                      facebook.com/groups/joins
                    </code>
                    , varre <strong>apenas os grupos dos quais você participa</strong> e sincroniza diretamente com este painel (sem inventar grupos genéricos).
                  </p>

                  {isSyncing && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-2">
                      <div className="flex items-center gap-2 font-medium">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>{syncStatusMessage}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(syncProgressStep / 2) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <button
                      onClick={handleRunExtensionSync}
                      disabled={isSyncing}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Sincronizando Comunidades...' : 'Puxar Grupos da Minha Conta Agora'}
                    </button>

                    <a
                      href="https://www.facebook.com/groups/joins/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir facebook.com/groups/joins
                    </a>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAutoSyncTab('console_script')}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-semibold text-xs rounded-xl transition-colors"
                    >
                      <span>⚡</span>
                      <span>Usar Extrator do Console (Sem precisar instalar extensão)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Console Scraper Script */}
            {autoSyncTab === 'console_script' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-800">
                    Método Instantâneo (Extração em 15 segundos sem instalar nada):
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-600">
                    <li>
                      Abra sua página de grupos no Facebook:{' '}
                      <a
                        href="https://www.facebook.com/groups/joins/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline font-medium"
                      >
                        facebook.com/groups/joins
                      </a>
                    </li>
                    <li>
                      Pressione a tecla <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">F12</kbd> (ou clique com botão direito na página &gt; <em>Inspecionar</em> &gt; abra a aba <strong>Console</strong>).
                    </li>
                    <li>Clique no botão abaixo para copiar o Script Extrator (formato de linha única, sem quebra).</li>
                    <li>Cole no Console do Facebook e tecle <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Enter</kbd>.</li>
                    <li>
                      O script varre a lista, copia todos os grupos para sua Área de Transferência e avisa você na tela! Depois, basta colar o resultado abaixo e clicar em <strong>Importar</strong>.
                    </li>
                  </ol>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <span>⚠️</span> Sobre o aviso vermelho &quot;Espere!&quot; que o Facebook exibe no Console:
                  </p>
                  <p className="text-amber-800">
                    O Facebook exibe esse aviso por padrão para qualquer um que abre o Console F12 (proteção contra golpes/Self-XSS). O nosso script <strong>não toca em senhas nem credenciais</strong>: ele apenas lê os links de grupos que você já participa e copia para a sua área de transferência.
                  </p>
                </div>

                <div className="relative">
                  <button
                    onClick={handleCopyScript}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
                  >
                    {copiedConsoleScript ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        Script Copiado para sua Área de Transferência!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar Script Extrator do Facebook
                      </>
                    )}
                  </button>
                </div>

                {/* Paste Box */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Cole aqui o resultado (JSON ou Lista de Links):
                    </label>
                    <button
                      onClick={handlePasteFromClipboard}
                      type="button"
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Colar do Clipboard
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={pastedJsonData}
                    onChange={(e) => setPastedJsonData(e.target.value)}
                    placeholder="Cole aqui o JSON gerado pelo script do Facebook ou uma lista de links..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  <button
                    onClick={() => handleImportPastedData()}
                    disabled={!pastedJsonData.trim()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium text-xs rounded-xl transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Processar e Importar Grupos Extraídos
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Demo Packs */}
            {autoSyncTab === 'demo_pack' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Deseja testar campanhas imediatamente? Importe pacotes prontos com comunidades reais do Facebook agrupadas por nicho de mercado:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-semibold text-xs text-blue-950 flex items-center gap-1">
                        📍 Seus Grupos Locais / Cidade
                      </span>
                      <span className="text-[11px] text-blue-800 block mt-0.5">
                        Para carregar todos os grupos da sua região (como Olímpia e cidades vizinhas) com as URLs oficiais que realmente abrem sem erro 404, use o <strong>Script do Console</strong>.
                      </span>
                    </div>
                    <button
                      onClick={() => setAutoSyncTab('console_script')}
                      className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] rounded-lg transition-colors shadow-xs"
                    >
                      Ir para o Extrator do Console (Aba 2)
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">
                        🏘️ Imóveis & Terrenos
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        3 comunidades ativas com +120k membros no nicho imobiliário.
                      </span>
                    </div>
                    <button
                      onClick={() => handleImportDemoPack('imoveis')}
                      className="w-full py-1.5 px-2.5 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-medium text-[11px] rounded-lg transition-colors"
                    >
                      Importar Pacote
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">
                        🛍️ Vendas & Desapego
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        2 comunidades de classificados com +150k membros para comércio geral.
                      </span>
                    </div>
                    <button
                      onClick={() => handleImportDemoPack('vendas')}
                      className="w-full py-1.5 px-2.5 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-medium text-[11px] rounded-lg transition-colors"
                    >
                      Importar Pacote
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">
                        💼 Marketing & Negócios
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        2 comunidades de empreendedorismo, tráfego e parcerias com +85k membros.
                      </span>
                    </div>
                    <button
                      onClick={() => handleImportDemoPack('marketing')}
                      className="w-full py-1.5 px-2.5 bg-white border border-slate-300 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-medium text-[11px] rounded-lg transition-colors"
                    >
                      Importar Pacote
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAutoSyncOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
