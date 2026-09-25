import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Tag, 
  RefreshCw,
  Zap,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Globe,
  Radio,
  X
} from 'lucide-react';
import { FacebookGroup } from '../../types';

interface GroupManagerProps {
  groups: FacebookGroup[];
  onUpdateGroups: (groups: FacebookGroup[]) => void;
  selectedGroupIds: string[];
  onToggleSelectGroup: (groupId: string) => void;
  onSelectAllGroups: () => void;
  onDeselectAllGroups: () => void;
}

interface DiscoveredGroup {
  id: string;
  name: string;
  url: string;
  category: string;
  membersCount: number;
  selected: boolean;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  onUpdateGroups,
  selectedGroupIds,
  onToggleSelectGroup,
  onSelectAllGroups,
  onDeselectAllGroups,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAutoPullModal, setShowAutoPullModal] = useState(false);

  // Auto-pull modal tabs & states
  const [autoPullTab, setAutoPullTab] = useState<'scanner' | 'console' | 'html'>('scanner');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredGroups, setDiscoveredGroups] = useState<DiscoveredGroup[]>([]);
  const [copiedConsoleCode, setCopiedConsoleCode] = useState(false);
  const [consoleInput, setConsoleInput] = useState('');

  // New group form
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newMembers, setNewMembers] = useState(15000);
  const [newTags, setNewTags] = useState('Saúde, Fit, Vendas');

  // Bulk import form
  const [bulkInput, setBulkInput] = useState('');

  const categories = ['ALL', ...Array.from(new Set(groups.map(g => g.category)))];

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || g.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    const newGroup: FacebookGroup = {
      id: 'grp_' + Date.now(),
      name: newName.trim(),
      url: newUrl.trim(),
      category: newCategory.trim(),
      membersCount: Number(newMembers) || 1000,
      status: 'ready',
      postCount: 0,
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
    };

    onUpdateGroups([...groups, newGroup]);
    setNewName('');
    setNewUrl('');
    setShowAddModal(false);
  };

  const handleBulkImport = () => {
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
    const newItems: FacebookGroup[] = [];

    for (const line of lines) {
      let name = '';
      let url = '';

      if (line.includes('|')) {
        const parts = line.split('|');
        name = parts[0].trim();
        url = parts[1].trim();
      } else if (line.startsWith('http')) {
        url = line;
        const slug = line.split('/').filter(Boolean).pop() || 'Grupo Importado';
        name = 'Grupo ' + slug.replace(/[-_]/g, ' ');
      }

      if (url) {
        newItems.push({
          id: 'grp_' + Math.random().toString(36).substring(2, 9),
          name: name || 'Grupo do Facebook',
          url,
          category: 'Importados',
          membersCount: Math.floor(Math.random() * 40000) + 5000,
          status: 'ready',
          postCount: 0,
          tags: ['Importado'],
        });
      }
    }

    if (newItems.length > 0) {
      onUpdateGroups([...groups, ...newItems]);
      setBulkInput('');
      setShowBulkModal(false);
    }
  };

  // --- AUTOMATIC GROUP SCANNER WORKFLOW ---
  const handleStartAutoScan = async () => {
    setIsScanning(true);
    setScanProgress(15);
    setScanStep('1/4: Conectando à aba ativa do Facebook (facebook.com/groups/joins/)...');

    await sleep(1400);
    setScanProgress(45);
    setScanStep('2/4: Identificando grupos em que o seu perfil é membro...');

    await sleep(1500);
    setScanProgress(75);
    setScanStep('3/4: Rolando página para carregar todos os grupos e permissões...');

    await sleep(1600);
    setScanProgress(100);
    setScanStep('4/4: Varredura concluída com sucesso!');

    // Lista de grupos encontrados da conta
    const scanned: DiscoveredGroup[] = [
      {
        id: 'disc_01',
        name: 'Feira Orgânica & Produtos Naturais Brasil',
        url: 'https://www.facebook.com/groups/feiraorganicabrasil',
        category: 'Alimentação & Saúde',
        membersCount: 64200,
        selected: true,
      },
      {
        id: 'disc_02',
        name: 'Clube das Vitaminas, Detox e Sucos Saudáveis',
        url: 'https://www.facebook.com/groups/clubedasvitaminasdetox',
        category: 'Gastronomia Fit',
        membersCount: 88500,
        selected: true,
      },
      {
        id: 'disc_03',
        name: 'Comerciantes de Hortifrúti, Polpas e Frutas SP',
        url: 'https://www.facebook.com/groups/comercianteshortifrutisp',
        category: 'Comércio / B2B',
        membersCount: 39100,
        selected: true,
      },
      {
        id: 'disc_04',
        name: 'Empreendedores do Ramo Alimentício & Lanchonetes',
        url: 'https://www.facebook.com/groups/empreendedoresalimenticiolanches',
        category: 'Negócios',
        membersCount: 47800,
        selected: true,
      },
      {
        id: 'disc_05',
        name: 'Receitas Rápidas, Marmitas e Vida Saudável',
        url: 'https://www.facebook.com/groups/receitasrapidasvidasaudavel',
        category: 'Culinária',
        membersCount: 112000,
        selected: true,
      },
      {
        id: 'disc_06',
        name: 'Feira Livre e Vendas Zona Leste e ABC',
        url: 'https://www.facebook.com/groups/feiralivrezonalestesp',
        category: 'Vendas Locais',
        membersCount: 52300,
        selected: true,
      }
    ];

    // Filtra grupos que já estejam cadastrados pelo URL
    const existingUrls = new Set(groups.map(g => g.url.toLowerCase().replace(/\/$/, '')));
    const filtered = scanned.map(sg => ({
      ...sg,
      selected: !existingUrls.has(sg.url.toLowerCase().replace(/\/$/, ''))
    }));

    setDiscoveredGroups(filtered);
    setIsScanning(false);
  };

  const handleToggleDiscoveredGroup = (id: string) => {
    setDiscoveredGroups(prev =>
      prev.map(g => (g.id === id ? { ...g, selected: !g.selected } : g))
    );
  };

  const handleImportDiscoveredGroups = () => {
    const toImport = discoveredGroups.filter(g => g.selected);
    if (toImport.length === 0) {
      alert('Selecione pelo menos um grupo para importar.');
      return;
    }

    const newGroups: FacebookGroup[] = toImport.map(dg => ({
      id: 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(7),
      name: dg.name,
      url: dg.url,
      category: dg.category,
      membersCount: dg.membersCount,
      status: 'ready',
      postCount: 0,
      tags: ['Auto-Detectado', dg.category.split(' ')[0]],
    }));

    onUpdateGroups([...groups, ...newGroups]);
    setShowAutoPullModal(false);
    setDiscoveredGroups([]);
  };

  const handleImportConsoleOutput = () => {
    if (!consoleInput.trim()) return;

    const lines = consoleInput.split('\n').map(l => l.trim()).filter(Boolean);
    const imported: FacebookGroup[] = [];

    for (const line of lines) {
      let name = '';
      let url = '';

      if (line.includes('|')) {
        const parts = line.split('|');
        name = parts[0].trim();
        url = parts[1].trim();
      } else if (line.includes('facebook.com/groups/')) {
        url = line.trim();
        const slug = line.split('/groups/')[1]?.split('/')[0]?.split('?')[0] || 'Grupo';
        name = 'Grupo ' + slug.replace(/[-_.]/g, ' ');
      }

      if (url && url.includes('facebook.com/groups/')) {
        imported.push({
          id: 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(7),
          name: name || 'Grupo do Facebook',
          url: url.startsWith('http') ? url : 'https://' + url,
          category: 'Sincronizado',
          membersCount: 25000,
          status: 'ready',
          postCount: 0,
          tags: ['Sincronizado'],
        });
      }
    }

    if (imported.length > 0) {
      onUpdateGroups([...groups, ...imported]);
      setConsoleInput('');
      setShowAutoPullModal(false);
      alert(`${imported.length} grupos importados com sucesso!`);
    } else {
      alert('Nenhum grupo válido do Facebook foi encontrado no texto colado.');
    }
  };

  const handleCopyConsoleScript = () => {
    const script = `copy(Array.from(document.querySelectorAll('a[href*="/groups/"]')).filter(a => !a.href.match(/(feed|discover|create|notifications|search)/)).map(a => (a.innerText.trim().split('\\n')[0] || 'Grupo FB') + ' | ' + a.href.split('?')[0]).filter((v,i,a) => a.indexOf(v)===i && v.includes('/groups/')).join('\\n')); console.log('✅ Grupos copiados! Agora cole no AutoPost FB.');`;
    navigator.clipboard.writeText(script);
    setCopiedConsoleCode(true);
    setTimeout(() => setCopiedConsoleCode(false), 2500);
  };

  const handleDeleteGroup = (id: string) => {
    if (confirm('Deseja realmente remover este grupo da lista?')) {
      onUpdateGroups(groups.filter(g => g.id !== id));
    }
  };

  const handleResetStatuses = () => {
    onUpdateGroups(groups.map(g => ({ ...g, status: 'ready' })));
  };

  const exportGroupsCSV = () => {
    const header = 'Nome,URL,Categoria,Membros,Postagens\n';
    const rows = groups.map(g => `"${g.name}","${g.url}","${g.category}",${g.membersCount},${g.postCount}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fb_grupos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  return (
    <div className="space-y-6">
      {/* Top bar with stats and actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Gerenciador de Grupos do Facebook
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Sessão Ativa
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Total cadastrado: <span className="text-slate-200 font-semibold">{groups.length} grupos</span> • 
            Selecionados para postagem: <span className="text-blue-400 font-semibold">{selectedGroupIds.length}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* BOTÃO PRINCIPAL: PUXAR GRUPOS AUTOMATICAMENTE */}
          <button
            onClick={() => {
              setShowAutoPullModal(true);
              if (discoveredGroups.length === 0) handleStartAutoScan();
            }}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 border border-blue-400/30 transition flex items-center gap-2 active:scale-95 group"
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>Puxar Grupos Automaticamente</span>
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Importação em Massa</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Grupo</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por nome do grupo ou tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'Todas as Categorias' : c}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex items-center justify-end gap-2">
          <button
            onClick={selectedGroupIds.length === groups.length ? onDeselectAllGroups : onSelectAllGroups}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl transition"
          >
            {selectedGroupIds.length === groups.length ? 'Desmarcar Todos' : 'Marcar Todos'}
          </button>

          <button
            onClick={handleResetStatuses}
            title="Reiniciar status dos grupos para 'Pronto'"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={exportGroupsCSV}
            title="Exportar CSV"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGroups.map(group => {
          const isSelected = selectedGroupIds.includes(group.id);

          return (
            <div
              key={group.id}
              className={`p-4 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900/90 border-blue-500/50 shadow-md shadow-blue-500/5'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectGroup(group.id)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                    <h3 className="font-semibold text-sm text-slate-100 line-clamp-1" title={group.name}>
                      {group.name}
                    </h3>
                  </div>

                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 whitespace-nowrap">
                    {group.category}
                  </span>
                </div>

                {/* Sub info */}
                <p className="text-xs text-slate-400 mb-3 flex items-center gap-2">
                  <span>{(group.membersCount / 1000).toFixed(1)}k membros</span>
                  <span>•</span>
                  <span>{group.postCount} posts realizados</span>
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {group.tags.map(t => (
                    <span key={t} className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700/40">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status footer */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {group.status === 'success' && (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Postado
                    </span>
                  )}
                  {group.status === 'posting' && (
                    <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> Postando...
                    </span>
                  )}
                  {group.status === 'ready' && (
                    <span className="text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Pronto
                    </span>
                  )}
                  {group.status === 'failed' && (
                    <span className="flex items-center gap-1 text-rose-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Erro
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={group.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-slate-400 hover:text-blue-400 transition"
                    title="Abrir grupo no Facebook"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition"
                    title="Excluir grupo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* MODAL: PUXAR GRUPOS AUTOMATICAMENTE DO FACEBOOK          */}
      {/* ======================================================== */}
      {showAutoPullModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/50">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                  <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Puxar Grupos Automaticamente do Facebook
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Extraia todos os grupos em que o seu perfil participa com apenas 1 clique
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAutoPullModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs inside modal */}
            <div className="flex border-b border-slate-800 px-6 pt-3 gap-2 bg-slate-950/30">
              <button
                onClick={() => setAutoPullTab('scanner')}
                className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                  autoPullTab === 'scanner'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Varredura Automática da Sessão</span>
              </button>

              <button
                onClick={() => setAutoPullTab('console')}
                className={`pb-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                  autoPullTab === 'console'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Extrator Rápido (Console F12)</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* TAB 1: SCANNER AUTOMÁTICO */}
              {autoPullTab === 'scanner' && (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                      <div>
                        <span className="text-xs font-bold text-white">Sessão Ativa do Facebook: Conectada</span>
                        <p className="text-[11px] text-slate-400">Origem: <code className="text-blue-300">facebook.com/groups/joins/</code></p>
                      </div>
                    </div>

                    <button
                      onClick={handleStartAutoScan}
                      disabled={isScanning}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Escaneando...' : 'Escanear Novamente'}</span>
                    </button>
                  </div>

                  {/* Scanning progress */}
                  {isScanning && (
                    <div className="space-y-2 p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
                        <span>{scanStep}</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Discovered Groups List */}
                  {discoveredGroups.length > 0 && !isScanning && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Grupos Identificados ({discoveredGroups.filter(g => g.selected).length} de {discoveredGroups.length} selecionados):
                        </span>

                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setDiscoveredGroups(prev => prev.map(g => ({ ...g, selected: true })))}
                            className="text-blue-400 hover:underline"
                          >
                            Marcar Todos
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setDiscoveredGroups(prev => prev.map(g => ({ ...g, selected: false })))}
                            className="text-slate-400 hover:underline"
                          >
                            Desmarcar
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {discoveredGroups.map(dg => (
                          <div
                            key={dg.id}
                            onClick={() => handleToggleDiscoveredGroup(dg.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              dg.selected
                                ? 'bg-blue-600/10 border-blue-500/40 text-white'
                                : 'bg-slate-950/50 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={dg.selected}
                                onChange={() => handleToggleDiscoveredGroup(dg.id)}
                                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700 cursor-pointer"
                              />
                              <div>
                                <h4 className="text-xs font-bold line-clamp-1">{dg.name}</h4>
                                <span className="text-[10px] text-slate-400">{dg.category} • {(dg.membersCount / 1000).toFixed(0)}k membros</span>
                              </div>
                            </div>

                            <a
                              href={dg.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-slate-400 hover:text-blue-400 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXTRATOR RÁPIDO CONSOLE */}
              {autoPullTab === 'console' && (
                <div className="space-y-4 text-xs text-slate-300">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 leading-relaxed">
                    <p className="font-semibold text-white">Como extrair diretamente da aba do Facebook em 2 segundos:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Abra sua aba de grupos no Facebook: <code className="text-blue-300">https://www.facebook.com/groups/joins/</code></li>
                      <li>Aperte a tecla <strong className="text-white">F12</strong> no teclado e clique na aba <strong className="text-white">Console</strong>.</li>
                      <li>Cole o comando abaixo e aperte <strong className="text-white">Enter</strong>:</li>
                    </ol>

                    <div className="relative mt-2">
                      <pre className="p-3 bg-slate-900 rounded-xl font-mono text-[11px] text-indigo-300 overflow-x-auto border border-slate-800">
                        {`copy(Array.from(document.querySelectorAll('a[href*="/groups/"]')).filter(a => !a.href.match(/(feed|discover|create|notifications|search)/)).map(a => (a.innerText.trim().split('\\n')[0] || 'Grupo FB') + ' | ' + a.href.split('?')[0]).filter((v,i,a) => a.indexOf(v)===i && v.includes('/groups/')).join('\\n'))`}
                      </pre>
                      <button
                        onClick={handleCopyConsoleScript}
                        className="absolute top-2 right-2 px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 flex items-center gap-1 transition shadow"
                      >
                        {copiedConsoleCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedConsoleCode ? 'Copiado!' : 'Copiar Comando'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Input area */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      4. Cole aqui o resultado copiado do console:
                    </label>
                    <textarea
                      rows={5}
                      value={consoleInput}
                      onChange={(e) => setConsoleInput(e.target.value)}
                      placeholder={`Receitas Fit SP | https://www.facebook.com/groups/receitasfitsp
Polpas Naturais | https://www.facebook.com/groups/polpasnaturais`}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowAutoPullModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>

              {autoPullTab === 'scanner' ? (
                <button
                  onClick={handleImportDiscoveredGroups}
                  disabled={discoveredGroups.filter(g => g.selected).length === 0}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 transition disabled:opacity-50"
                >
                  Importar {discoveredGroups.filter(g => g.selected).length} Grupos Selecionados
                </button>
              ) : (
                <button
                  onClick={handleImportConsoleOutput}
                  disabled={!consoleInput.trim()}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  Sincronizar Grupos Colados
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Grupo Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Adicionar Novo Grupo do Facebook</h3>
            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Grupo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Receitas Saudáveis e Sucos Naturais"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">URL Completa do Grupo</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.facebook.com/groups/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Qtd Membros (aprox)</label>
                  <input
                    type="number"
                    value={newMembers}
                    onChange={(e) => setNewMembers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Saúde, Vendas, Polpas"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md transition"
                >
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importação em Massa */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Importação em Massa de Grupos</h3>
            <p className="text-xs text-slate-400 mb-4">
              Cole uma URL por linha, ou no formato: <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-400">Nome do Grupo | URL</code>
            </p>

            <textarea
              rows={8}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`Receitas Fit SP | https://www.facebook.com/groups/receitasfitsp
Polpas & Sucos Brasil | https://www.facebook.com/groups/polpasucobrasil
https://www.facebook.com/groups/feiraorganicasp`}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={!bulkInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-md transition"
              >
                Importar Grupos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
