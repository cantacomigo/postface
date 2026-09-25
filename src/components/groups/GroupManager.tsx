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
  RefreshCw 
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
      // Formatos aceitos: "Nome | https://facebook.com/groups/..." OU apenas "https://..."
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

  return (
    <div className="space-y-6">
      {/* Top bar with stats and actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Gerenciador de Grupos do Facebook
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Total: <span className="text-slate-200 font-semibold">{groups.length} grupos</span> • 
            Selecionados para postagem: <span className="text-blue-400 font-semibold">{selectedGroupIds.length}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Importação em Massa</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition flex items-center gap-1.5"
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
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'Todas as Categorias' : c}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex items-center justify-end gap-2">
          <button
            onClick={selectedGroupIds.length === groups.length ? onDeselectAllGroups : onSelectAllGroups}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg transition"
          >
            {selectedGroupIds.length === groups.length ? 'Desmarcar Todos' : 'Marcar Todos'}
          </button>

          <button
            onClick={handleResetStatuses}
            title="Reiniciar status dos grupos para 'Pronto'"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={exportGroupsCSV}
            title="Exportar CSV"
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
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
              className={`p-4 rounded-xl border transition-all duration-200 relative group flex flex-col justify-between ${
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
                    <h3 className="font-semibold text-sm text-slate-100 line-clamp-1 title={group.name}">
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

      {/* Modal Novo Grupo */}
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
