import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Eye, 
  Layers, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { PostTemplate } from '../../types';
import { renderTemplate, countSpintaxVariations } from '../../utils/spintax';

interface TemplateManagerProps {
  templates: PostTemplate[];
  onUpdateTemplates: (templates: PostTemplate[]) => void;
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onUpdateTemplates,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  const [activeEditingId, setActiveEditingId] = useState<string>(selectedTemplateId || templates[0]?.id || '');
  const [previewText, setPreviewText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  // Form states for new template
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');
  const [newBody, setNewBody] = useState('');

  const currentTemplate = templates.find(t => t.id === activeEditingId) || templates[0];

  // Refresh Spintax Preview
  const handleGeneratePreview = () => {
    if (!currentTemplate) return;
    const rendered = renderTemplate(currentTemplate.bodyWithSpintax, {
      nome_grupo: 'Receitas Fit e Sucos Saudáveis SP',
      categoria: currentTemplate.category,
    });
    setPreviewText(rendered);
  };

  // Generate initial preview on selection change
  React.useEffect(() => {
    if (currentTemplate) {
      const rendered = renderTemplate(currentTemplate.bodyWithSpintax, {
        nome_grupo: 'Alimentação Saudável Brasil',
      });
      setPreviewText(rendered);
    }
  }, [activeEditingId, currentTemplate]);

  const handleUpdateCurrentBody = (text: string) => {
    if (!currentTemplate) return;
    const updated = templates.map(t => (t.id === currentTemplate.id ? { ...t, bodyWithSpintax: text } : t));
    onUpdateTemplates(updated);
  };

  const handleInsertVariable = (variable: string) => {
    if (!currentTemplate) return;
    const updated = currentTemplate.bodyWithSpintax + ' ' + variable;
    handleUpdateCurrentBody(updated);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newBody.trim()) return;

    const newTpl: PostTemplate = {
      id: 'tpl_' + Date.now(),
      name: newName.trim(),
      category: newCategory.trim(),
      bodyWithSpintax: newBody.trim(),
      mediaUrls: [
        'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80'
      ],
      tags: ['Personalizado'],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    onUpdateTemplates([...templates, newTpl]);
    setActiveEditingId(newTpl.id);
    onSelectTemplate(newTpl.id);
    setNewName('');
    setNewBody('');
    setShowNewModal(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      alert('Você deve manter pelo menos um template cadastrado.');
      return;
    }
    if (confirm('Deseja realmente excluir este template?')) {
      const remaining = templates.filter(t => t.id !== id);
      onUpdateTemplates(remaining);
      setActiveEditingId(remaining[0].id);
      onSelectTemplate(remaining[0].id);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const variationsCount = currentTemplate ? countSpintaxVariations(currentTemplate.bodyWithSpintax) : 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Gerenciador de Templates & Motor Spintax
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Crie copys com variações automáticas anti-bloqueio e injeção única sem repetições
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Template</span>
        </button>
      </div>

      {/* Main Grid: Template List + Editor + Live FB Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Template Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Seus Modelos ({templates.length})
          </label>

          <div className="space-y-2">
            {templates.map(tpl => {
              const isSelected = tpl.id === activeEditingId;
              const isCampaignActive = tpl.id === selectedTemplateId;

              return (
                <div
                  key={tpl.id}
                  onClick={() => {
                    setActiveEditingId(tpl.id);
                    onSelectTemplate(tpl.id);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500/60 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-slate-100 line-clamp-1">
                      {tpl.name}
                    </h4>
                    {isCampaignActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 font-normal">
                    {tpl.bodyWithSpintax.replace(/[{}]/g, '')}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      {countSpintaxVariations(tpl.bodyWithSpintax)} variações
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(tpl.id);
                      }}
                      className="p-1 hover:text-rose-400 transition"
                      title="Excluir template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: Spintax Code Editor */}
        <div className="lg:col-span-8 space-y-4">
          {currentTemplate && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {currentTemplate.name}
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {currentTemplate.category}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Potencial de variação: <strong className="text-indigo-400">{variationsCount.toLocaleString('pt-BR')} copys únicas</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGeneratePreview}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/50 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Testar Spintax</span>
                  </button>
                </div>
              </div>

              {/* Variable Quick Inserts */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Inserir variáveis:</span>
                {[
                  { tag: '{nome_grupo}', label: 'Nome do Grupo' },
                  { tag: '{saudacao}', label: 'Saudação (Horário)' },
                  { tag: '{data}', label: 'Data Atual' },
                  { tag: '{hora}', label: 'Hora' },
                ].map(v => (
                  <button
                    key={v.tag}
                    onClick={() => handleInsertVariable(v.tag)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 font-mono transition"
                  >
                    {v.tag}
                  </button>
                ))}
              </div>

              {/* Text Area */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Texto com Sintaxe Spintax (Use <code className="text-indigo-400">{'{Opção A|Opção B}'}</code> para variações)
                </label>
                <textarea
                  rows={9}
                  value={currentTemplate.bodyWithSpintax}
                  onChange={(e) => handleUpdateCurrentBody(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Live Preview Box (Simulation of FB Post) */}
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    Prévia do Post Gerado (Sem repetição 1x)
                  </span>

                  <button
                    onClick={handleCopyPreview}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Prévia</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900/90 rounded-lg p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-800">
                  {previewText || 'Clique em "Testar Spintax" para renderizar.'}
                </div>

                {/* Media Preview */}
                {currentTemplate.mediaUrls && currentTemplate.mediaUrls.length > 0 && (
                  <div>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-2">
                      <ImageIcon className="w-3 h-3 text-slate-400" /> Fotos anexadas na publicação:
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {currentTemplate.mediaUrls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Prévia de foto"
                          className="h-20 w-28 object-cover rounded-lg border border-slate-800 shadow"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Novo Template */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Criar Novo Template com Spintax</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Modelo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polpas Congeladas - Oferta Especial"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Texto (com suporte a Spintax {'{A|B|C}'})
                </label>
                <textarea
                  rows={6}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="{Olá|Oi} amigos do {nome_grupo}! Conheçam nossos produtos..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md transition"
                >
                  Criar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
