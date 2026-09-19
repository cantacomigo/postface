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
  PlayCircle
} from 'lucide-react';

interface GroupManagerProps {
  groups: FacebookGroup[];
  categories: GroupCategory[];
  onSaveGroup: (group: FacebookGroup) => void;
  onDeleteGroup: (id: string) => void;
  onBulkAddGroups: (newGroups: FacebookGroup[]) => void;
  onSaveCategory: (category: GroupCategory) => void;
  onDeleteCategory: (id: string) => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  groups,
  categories,
  onSaveGroup,
  onDeleteGroup,
  onBulkAddGroups,
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

  return (
    <div className="space-y-6">
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
            onClick={() => setIsManagingCategories(!isManagingCategories)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
          >
            <Tag className="w-4 h-4 text-slate-500" />
            Gerenciar Categorias ({categories.length})
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
        </div>
      </div>

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
                        <a
                          href={grp.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                        >
                          {grp.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
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
    </div>
  );
};
