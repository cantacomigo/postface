import { FacebookGroup, PostTemplate, AntiBanConfig, ExecutionLog } from '../types';

const STORAGE_KEYS = {
  GROUPS: 'fb_autopost_groups_v2',
  TEMPLATES: 'fb_autopost_templates_v2',
  ANTIBAN: 'fb_autopost_antiban_v2',
  LOGS: 'fb_autopost_logs_v2',
};

export const DEFAULT_ANTIBAN_CONFIG: AntiBanConfig = {
  minDelaySeconds: 45,
  maxDelaySeconds: 110,
  postsPerHourLimit: 12,
  postsPerDayLimit: 40,
  humanTypingSpeed: true,
  typingDelayMs: 35,
  randomizeOrder: true,
  pauseAfterConsecutive: 4,
  pauseDurationMinutes: 10,
  duplicateProtection: true, // Garante que NUNCA repita o texto 3x
  detectWarnings: true,
  zeroWidthRandomizer: true,
};

export const INITIAL_GROUPS: FacebookGroup[] = [
  {
    id: 'grp_001',
    name: 'Alimentação Saudável & Sucos Naturais BR',
    url: 'https://www.facebook.com/groups/alimentacaosaudavelbrasil',
    category: 'Saúde e Nutrição',
    membersCount: 42800,
    status: 'ready',
    postCount: 14,
    tags: ['Fit', 'Sucos', 'Saúde'],
    notes: 'Grupo ativo, moderador aceita dicas de produtos saudáveis.',
  },
  {
    id: 'grp_002',
    name: 'Receitas Fitness, Vitaminas e Detox',
    url: 'https://www.facebook.com/groups/receitasfitvitaminasdetox',
    category: 'Gastronomia Fit',
    membersCount: 89300,
    status: 'ready',
    postCount: 22,
    tags: ['Detox', 'Polpas', 'Vitaminas'],
    notes: 'Melhor horário para postar: manhã e tarde.',
  },
  {
    id: 'grp_003',
    name: 'Feira Livre e Hortifruti SP & Região',
    url: 'https://www.facebook.com/groups/feiralivrehortifrutisp',
    category: 'Comércio Local',
    membersCount: 31200,
    status: 'ready',
    postCount: 8,
    tags: ['Frutas', 'Comércio', 'SP'],
    notes: 'Excelente engajamento para polpas e frutas congeladas.',
  },
  {
    id: 'grp_004',
    name: 'Empreendedores de Açaí, Sorvetes e Sucos',
    url: 'https://www.facebook.com/groups/empreendedoresacaisorvetes',
    category: 'Negócios / B2B',
    membersCount: 19500,
    status: 'ready',
    postCount: 5,
    tags: ['B2B', 'Atacado', 'FoodService'],
  },
  {
    id: 'grp_005',
    name: 'Vida Saudável & Nutrição Prática RJ',
    url: 'https://www.facebook.com/groups/vidasaudavelnutricaorj',
    category: 'Saúde',
    membersCount: 27400,
    status: 'ready',
    postCount: 11,
    tags: ['Fit', 'Praticidade'],
  },
  {
    id: 'grp_006',
    name: 'Mães e Família: Lanches Rápidos & Saudáveis',
    url: 'https://www.facebook.com/groups/maeslanchessaudaveis',
    category: 'Família / Culinária',
    membersCount: 54100,
    status: 'ready',
    postCount: 9,
    tags: ['Crianças', 'Lanches', 'Naturais'],
  },
];

export const INITIAL_TEMPLATES: PostTemplate[] = [
  {
    id: 'tpl_demarchi_polpas',
    name: 'Polpas de Frutas De Marchi (Anti-Duplicação 100%)',
    category: 'Produtos / Frutas',
    bodyWithSpintax: `{🍹✨|🥤🌟|🍓✨} {Procurando|Buscando|Quer} uma forma {prática|fácil|rápida} de manter a rotina saudável sem abrir mão do sabor de verdade?

Com as {Polpas de Frutas De Marchi|nossas polpas congeladas selecionadas}, você tem a qualidade da fruta colhida no campo direto no seu congelador! 🍓🍋🍍

{Diga adeus|Esqueça|Livre-se d}o trabalho de descascar frutas e à sujeira na cozinha. Nossas polpas são:
🌱 {100% Naturais e livres de conservantes|Totalmente naturais, sem adição de químicos}
❄️ {Congeladas rapidamente para preservar todo o sabor e os nutrientes|Ultra-congeladas preservando 100% dos nutrientes e frescor}
💡 {Práticas e deliciosas, perfeitas para sucos, vitaminas e smoothies a qualquer hora do dia|Ideais para aquele smoothie refrescante, shake ou vitamina no café da manhã}

{Deixe o seu dia a dia muito mais gostoso e refrescante|Transforme a sua alimentação com praticidade} com os nossos mais de 30 sabores — como Acerola com Laranja, Uva, Pitaya, Maracujá, Manga e muito mais!

🛒 {Experimente já! Garanta as suas polpas De Marchi no supermercado mais próximo ou peça direto pelo nosso site.|Peça já as suas ou encontre no mercado mais perto de você!}

{Qual desses sabores é o seu favorito? Conte aqui nos comentários! 👇|Qual polpa não pode faltar no seu congelador? Deixe seu comentário! 👇}`,
    mediaUrls: [
      'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80'
    ],
    tags: ['De Marchi', 'Polpas', 'Sucos', 'Saúde'],
    createdAt: '2026-09-24T10:00:00Z',
    usageCount: 47,
  },
  {
    id: 'tpl_dica_rapida',
    name: 'Dica Rápida: Smoothie Energético Matinal',
    category: 'Dicas / Engajamento',
    bodyWithSpintax: `{Bom dia, pessoal!|{Olá|Oi} amigos do {nome_grupo}!|Dica rápida para começar o dia com energia! ⚡}

{Você já experimentou bater|Uma receita infalível é misturar} polpa de pitaya com água de coco e um toque de hortelã? 🌺🥥

Fica {maravilhoso|perfeito|delicioso}, além de ser super antioxidante e dar uma disposição incrível logo pela manhã.

{Qual fruta você costuma usar no seu suco matinal? Me conta aqui! 👇|Vocês preferem suco de manhã ou à tarde? 👇}`,
    mediaUrls: [
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80'
    ],
    tags: ['Receita', 'Smoothie', 'Energia'],
    createdAt: '2026-09-23T14:30:00Z',
    usageCount: 19,
  }
];

export const INITIAL_LOGS: ExecutionLog[] = [
  {
    id: 'log_001',
    timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('pt-BR'),
    groupId: 'grp_001',
    groupName: 'Alimentação Saudável & Sucos Naturais BR',
    templateId: 'tpl_demarchi_polpas',
    templateName: 'Polpas de Frutas De Marchi',
    status: 'success',
    message: 'Postagem publicada com sucesso. Injeção única validada (Sem repetição).',
    renderedContent: '🍹✨ Procurando uma forma prática de manter a rotina saudável sem abrir mão do sabor de verdade?...',
    postUrl: 'https://facebook.com/groups/alimentacaosaudavelbrasil/permalink/98127391',
    durationSeconds: 78,
  }
];

export function getStoredGroups(): FacebookGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(INITIAL_GROUPS));
      return INITIAL_GROUPS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_GROUPS;
  }
}

export function saveGroups(groups: FacebookGroup[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  } catch (e) {
    console.error('Falha ao salvar grupos:', e);
  }
}

export function getStoredTemplates(): PostTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
      return INITIAL_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TEMPLATES;
  }
}

export function saveTemplates(templates: PostTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Falha ao salvar templates:', e);
  }
}

export function getStoredAntiBan(): AntiBanConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ANTIBAN);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ANTIBAN, JSON.stringify(DEFAULT_ANTIBAN_CONFIG));
      return DEFAULT_ANTIBAN_CONFIG;
    }
    return { ...DEFAULT_ANTIBAN_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ANTIBAN_CONFIG;
  }
}

export function saveAntiBan(config: AntiBanConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANTIBAN, JSON.stringify(config));
  } catch (e) {
    console.error('Falha ao salvar configurações anti-ban:', e);
  }
}

export function getStoredLogs(): ExecutionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_LOGS;
  }
}

export function saveLogs(logs: ExecutionLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 150)));
  } catch (e) {
    console.error('Falha ao salvar logs:', e);
  }
}
