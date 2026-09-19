import React, { useState } from 'react';
import { PostTemplate } from '../../types';
import { resolveSpintax, calculateVariationsCount, generateSampleVariations } from '../../utils/spintax';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Video,
  Sparkles,
  Shuffle,
  Eye,
  Copy,
  Tag,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface TemplateManagerProps {
  templates: PostTemplate[];
  onSaveTemplate: (template: PostTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onSaveTemplate,
  onDeleteTemplate
}) => {
  const [editingTemplate, setEditingTemplate] = useState<PostTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<PostTemplate | null>(templates[0] || null);
  const [sampleVariationText, setSampleVariationText] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');

  const emptyTemplate: PostTemplate = {
    id: `tpl-${Date.now()}`,
    title: '',
    content: '{Olá|E aí|Bom dia} amigos! {Confira|Veja} nossa nova oportunidade.',
    mediaType: 'images',
    images: [],
    focusType: 'image_title',
    tags: ['Geral'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const handleStartCreate = () => {
    const fresh = { ...emptyTemplate, id: `tpl-${Date.now()}` };
    setEditingTemplate(fresh);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (tpl: PostTemplate) => {
    setEditingTemplate({ ...tpl, images: [...tpl.images], tags: [...tpl.tags] });
    setIsCreatingNew(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editingTemplate.title.trim() || !editingTemplate.content.trim()) {
      return;
    }

    const updated: PostTemplate = {
      ...editingTemplate,
      updatedAt: new Date().toISOString()
    };

    onSaveTemplate(updated);
    setPreviewTemplate(updated);
    setEditingTemplate(null);
    setIsCreatingNew(false);
  };

  const handleAddImage = (url: string) => {
    if (!editingTemplate || !url) return;
    if (editingTemplate.images.length >= 10) {
      alert('Limite máximo de 10 imagens por template atingido.');
      return;
    }
    setEditingTemplate({
      ...editingTemplate,
      images: [...editingTemplate.images, url]
    });
    setNewImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    if (!editingTemplate) return;
    const updated = editingTemplate.images.filter((_, idx) => idx !== index);
    setEditingTemplate({ ...editingTemplate, images: updated });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editingTemplate) return;

    const remainingSlots = 10 - editingTemplate.images.length;
    const toProcess = Array.from(files).slice(0, remainingSlots);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleAddImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim() || !editingTemplate) return;
    if (!editingTemplate.tags.includes(newTag.trim())) {
      setEditingTemplate({
        ...editingTemplate,
        tags: [...editingTemplate.tags, newTag.trim()]
      });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      tags: editingTemplate.tags.filter((t) => t !== tag)
    });
  };

  // Preview helper
  const currentPreviewSource = editingTemplate || previewTemplate || templates[0];
  const variationsCount = currentPreviewSource ? calculateVariationsCount(currentPreviewSource.content) : 1;

  const handleRegeneratePreview = () => {
    if (currentPreviewSource) {
      setSampleVariationText(resolveSpintax(currentPreviewSource.content));
    }
  };

  const sampleVariations = currentPreviewSource
    ? generateSampleVariations(currentPreviewSource.content, 3)
    : [];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Gerenciador de Templates de Anúncios
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Crie copys modulares com suporte a Spintax anti-detecção, até 10 imagens e formatação dinâmica.
          </p>
        </div>

        <button
          id="btn-create-template"
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-blue-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Template List or Form */}
        <div className="lg:col-span-7 space-y-6">
          {editingTemplate ? (
            /* Edit / Create Form */
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  {isCreatingNew ? 'Novo Template de Post' : 'Editar Template'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Título de Referência Interno *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTemplate.title}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, title: e.target.value })
                    }
                    placeholder="Ex: Lançamento Imóveis Zona Sul - Oferta Verão"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Focus Structure */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estruturação do Post
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTemplate({ ...editingTemplate, focusType: 'image_title' })
                      }
                      className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                        editingTemplate.focusType === 'image_title'
                          ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Focado em Imagem + Título</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingTemplate({ ...editingTemplate, focusType: 'standard' })
                      }
                      className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                        editingTemplate.focusType === 'standard'
                          ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Padrão (Texto Rico)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingTemplate({ ...editingTemplate, focusType: 'text_only' })
                      }
                      className={`p-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                        editingTemplate.focusType === 'text_only'
                          ? 'border-blue-600 bg-blue-50/60 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Apenas Texto</span>
                    </button>
                  </div>
                </div>

                {/* Content / Spintax */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      Conteúdo do Post (com Spintax Anti-Ban)
                      <span className="text-blue-600 lowercase font-normal">
                        &#123;opção 1|opção 2&#125;
                      </span>
                    </label>
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      {calculateVariationsCount(editingTemplate.content)} variações possíveis
                    </span>
                  </div>

                  <textarea
                    rows={6}
                    required
                    value={editingTemplate.content}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, content: e.target.value })
                    }
                    placeholder="{Olá|Oi|Bom dia}! {Apresentamos|Confira} nossa oportunidade..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Dica Anti-Bloqueio: Use variações de saudações, verbos e chamadas para ação. Cada post enviado pelo motor será único no algoritmo do Facebook.
                  </p>
                </div>

                {/* Media Section: Up to 10 Images or 1 Video */}
                {editingTemplate.focusType !== 'text_only' && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Mídia Anexada
                        </label>
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingTemplate({ ...editingTemplate, mediaType: 'images' })
                            }
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                              editingTemplate.mediaType === 'images'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Imagens ({editingTemplate.images.length}/10)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setEditingTemplate({ ...editingTemplate, mediaType: 'video' })
                            }
                            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                              editingTemplate.mediaType === 'video'
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Vídeo
                          </button>
                        </div>
                      </div>

                      {editingTemplate.mediaType === 'images' && (
                        <span className="text-xs text-slate-500">
                          Máximo: 10 fotos
                        </span>
                      )}
                    </div>

                    {editingTemplate.mediaType === 'images' && (
                      <div className="space-y-3">
                        {/* Add image URL or file upload */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="url"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="Cole o link da imagem (https://...)"
                            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddImage(newImageUrl)}
                            disabled={!newImageUrl || editingTemplate.images.length >= 10}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            Adicionar URL
                          </button>

                          <label className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium cursor-pointer flex items-center justify-center gap-1">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Local</span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Image thumbnails */}
                        {editingTemplate.images.length > 0 ? (
                          <div className="grid grid-cols-5 gap-2 pt-2">
                            {editingTemplate.images.map((img, idx) => (
                              <div
                                key={idx}
                                className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-200"
                              >
                                <img
                                  src={img}
                                  alt={`Mídia ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=300&q=80';
                                  }}
                                />
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="absolute top-1 right-1 bg-red-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                            <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                            <p className="text-xs text-slate-500">
                              Nenhuma imagem anexada. Adicione fotos para enriquecer o anúncio.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {editingTemplate.mediaType === 'video' && (
                      <div className="space-y-2">
                        <label className="block text-xs text-slate-600">
                          URL do Vídeo (Facebook ou MP4 direto)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={editingTemplate.videoUrl || ''}
                            onChange={(e) =>
                              setEditingTemplate({ ...editingTemplate, videoUrl: e.target.value })
                            }
                            placeholder="https://exemplo.com/video.mp4"
                            className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Etiquetas & Segmentação
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editingTemplate.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs"
                      >
                        <Tag className="w-3 h-3 text-slate-400" />
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-red-600 ml-1 text-slate-400"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Adicionar tag (ex: Imóveis, Carros, Tech)"
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
                  >
                    Salvar Template
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Templates List */
            <div className="space-y-3">
              {templates.map((tpl) => {
                const isSelected = previewTemplate?.id === tpl.id;
                const totalCombos = calculateVariationsCount(tpl.content);

                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setPreviewTemplate(tpl);
                      setSampleVariationText(resolveSpintax(tpl.content));
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{tpl.title}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {tpl.focusType === 'image_title'
                              ? 'Foco Imagem + Título'
                              : tpl.focusType === 'standard'
                              ? 'Padrão'
                              : 'Apenas Texto'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {tpl.content}
                        </p>

                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            {tpl.images.length} {tpl.images.length === 1 ? 'imagem' : 'imagens'}
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            {totalCombos} variações Spintax
                          </span>
                          <span className="text-slate-400">
                            Atualizado em {new Date(tpl.updatedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleStartEdit(tpl)}
                          title="Editar"
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (templates.length <= 1) {
                              alert('Mantenha ao menos um template cadastrado.');
                              return;
                            }
                            if (confirm(`Deseja excluir o template "${tpl.title}"?`)) {
                              onDeleteTemplate(tpl.id);
                            }
                          }}
                          title="Excluir"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Facebook Preview & Spintax Inspector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulated Facebook Post Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-xs tracking-wide uppercase">
                  Prévia em Tempo Real (Feed do Facebook)
                </span>
              </div>
              <button
                type="button"
                onClick={handleRegeneratePreview}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Gerar Variação
              </button>
            </div>

            {/* Facebook post header simulation */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  FB
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-900 text-sm">Seu Perfil / Página</span>
                    <span className="text-slate-400 text-xs">• Seguir</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span>Publicado no Grupo Alvo</span>
                    <span>•</span>
                    <span>Agora mesmo</span>
                    <span>•</span>
                    <span>🌐</span>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                {sampleVariationText || (currentPreviewSource ? resolveSpintax(currentPreviewSource.content) : '')}
              </div>

              {/* Images Grid preview */}
              {currentPreviewSource && currentPreviewSource.images.length > 0 && (
                <div
                  className={`grid gap-1 rounded-xl overflow-hidden border border-slate-200 mt-2 ${
                    currentPreviewSource.images.length === 1
                      ? 'grid-cols-1'
                      : currentPreviewSource.images.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                  }`}
                >
                  {currentPreviewSource.images.slice(0, 3).map((img, i) => (
                    <div key={i} className="relative aspect-video bg-slate-100">
                      <img
                        src={img}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      {i === 2 && currentPreviewSource.images.length > 3 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                          +{currentPreviewSource.images.length - 3} fotos
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Facebook Engagement Mockup Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-around text-xs text-slate-500 font-medium">
                <span className="hover:text-blue-600 cursor-pointer">👍 Curtir</span>
                <span className="hover:text-blue-600 cursor-pointer">💬 Comentar</span>
                <span className="hover:text-blue-600 cursor-pointer">↗ Compartilhar</span>
              </div>
            </div>

            {/* Spintax Samples Inspector */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Amostras Aleatórias de Saída (Anti-Ban)
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  {variationsCount} permutações
                </span>
              </div>

              <div className="space-y-1.5">
                {sampleVariations.map((v, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 font-mono"
                  >
                    <span className="font-bold text-blue-600 mr-1.5">#{i + 1}:</span>
                    {v.slice(0, 120)}...
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
