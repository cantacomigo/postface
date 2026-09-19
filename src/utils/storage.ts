import { PostTemplate, GroupCategory, FacebookGroup, AntiBanRules, CampaignLog } from '../types';

export const DEFAULT_CATEGORIES: GroupCategory[] = [
  {
    id: 'cat-imoveis',
    name: 'Imóveis & Locação',
    color: '#0284c7', // sky-600
    description: 'Grupos de compra, venda e locação de imóveis residenciais e comerciais'
  },
  {
    id: 'cat-empreend',
    name: 'Negócios & Oportunidades',
    color: '#16a34a', // green-600
    description: 'Comunidades de networking, prestadores de serviços e vendas B2B'
  },
  {
    id: 'cat-tech',
    name: 'Tecnologia & Startups',
    color: '#7c3aed', // violet-600
    description: 'Grupos de desenvolvedores, produtos digitais e gadgets'
  },
  {
    id: 'cat-geral',
    name: 'Feira Livre & Classificados',
    color: '#ea580c', // orange-600
    description: 'Grupos gerais de compra e venda de cidades específicas'
  }
];

export const DEFAULT_TEMPLATES: PostTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Lançamento Studio & Aptos Modernos',
    content: '{Olá|E aí|Bom dia} pessoal! 🏢\n\n{Estamos com|Confira as|Disponibilizamos as} últimas unidades para quem busca {conforto|praticidade|alta rentabilidade} na região central.\n\n✅ {Metragem inteligente|Plantas modernas de 32m² a 54m²}\n✅ {Lazer completo na cobertura|Piscina, coworking e academia}\n✅ {Financiamento facilitado|Entrada parcelada direto com a construtora}\n\n👉 {Deixe um comentário|Envie uma mensagem no direct|Chame no WhatsApp} para receber o catálogo com fotos!',
    mediaType: 'images',
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80'
    ],
    focusType: 'image_title',
    tags: ['Imóveis', 'Lançamento', 'Apartamentos'],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'tpl-2',
    title: 'Consultoria de Automação & Eficiência',
    content: '{Atenção empresários|Para donos de negócios|Olá empreendedores}!\n\n{Sua equipe|Você} ainda perde {horas preciosas|muito tempo} com processos manuais repetitivos?\n\n🚀 {Apresentamos nossa consultoria|Conheça soluções práticas} de automação de fluxo de trabalho.\n\n{Reduza custos operacionais|Aumente a produtividade em até 3x} sem complicações.\n\nComente "{QUERO SABER MAIS|TENHO INTERESSE}" para agendar uma demonstração rápida de 15 minutos!',
    mediaType: 'images',
    images: [
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80'
    ],
    focusType: 'standard',
    tags: ['B2B', 'Produtividade', 'Tecnologia'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'tpl-3',
    title: 'Curso Prático de Gestão de Tráfego',
    content: '{Fala galera|Olá pessoal|E aí time}!\n\n{Abrimos novas vagas|Restam poucas inscrições|Liberamos acesso imediato} para a formação em Gestão de Campanhas.\n\n🎯 {Do zero ao avançado|Passo a passo com estudos de caso reais}\n🎯 {Aulas ao vivo e suporte diário|Comunidade exclusiva de networking}\n\nLink na bio ou envie mensagem para garantir condição especial {desta semana|de lançamento}!',
    mediaType: 'images',
    images: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=800&q=80'
    ],
    focusType: 'image_title',
    tags: ['Marketing', 'Cursos', 'Carreira'],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_GROUPS: FacebookGroup[] = [
  {
    id: 'grp-1',
    fbId: '109847291823456',
    name: 'Classificados & Imóveis Zona Sul SP',
    url: 'https://www.facebook.com/groups/imoveiszonasulsp',
    categoryId: 'cat-imoveis',
    privacy: 'public',
    membersCount: 48200,
    status: 'active',
    lastPostedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    notes: 'Excelente engajamento matutino'
  },
  {
    id: 'grp-2',
    fbId: '204958192837465',
    name: 'Apartamentos e Casas - Grande SP',
    url: 'https://www.facebook.com/groups/apartamentoscasassp',
    categoryId: 'cat-imoveis',
    privacy: 'public',
    membersCount: 89400,
    status: 'active',
    lastPostedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Aprovação de post é automática'
  },
  {
    id: 'grp-3',
    fbId: '394857291048273',
    name: 'Empreendedores e Startups Brasil',
    url: 'https://www.facebook.com/groups/empreendedoresbrasil',
    categoryId: 'cat-empreend',
    privacy: 'public',
    membersCount: 63100,
    status: 'active',
    notes: 'Permite postagens com ofertas nas sextas'
  },
  {
    id: 'grp-4',
    fbId: '483920194857291',
    name: 'Networking & Oportunidades Comerciais',
    url: 'https://www.facebook.com/groups/networkingnegocios',
    categoryId: 'cat-empreend',
    privacy: 'public',
    membersCount: 31200,
    status: 'active'
  },
  {
    id: 'grp-5',
    fbId: '593820194857102',
    name: 'Desenvolvedores e Tech Workers Brasil',
    url: 'https://www.facebook.com/groups/devstechbrasil',
    categoryId: 'cat-tech',
    privacy: 'public',
    membersCount: 52000,
    status: 'active'
  },
  {
    id: 'grp-6',
    fbId: '694820194857391',
    name: 'Bazar e Feira Livre Paulistana',
    url: 'https://www.facebook.com/groups/feiralivresp',
    categoryId: 'cat-geral',
    privacy: 'public',
    membersCount: 114000,
    status: 'active'
  },
  {
    id: 'grp-7',
    fbId: '794820194857402',
    name: 'Investidores Imobiliários & Corretores',
    url: 'https://www.facebook.com/groups/investidoresimob',
    categoryId: 'cat-imoveis',
    privacy: 'public',
    membersCount: 27500,
    status: 'active'
  },
  {
    id: 'grp-8',
    fbId: '894820194857503',
    name: 'Vendas & Prestação de Serviços SP',
    url: 'https://www.facebook.com/groups/prestacaoservicossp',
    categoryId: 'cat-empreend',
    privacy: 'public',
    membersCount: 41800,
    status: 'active'
  }
];

export const DEFAULT_ANTI_BAN_RULES: AntiBanRules = {
  minDelaySeconds: 120, // 2 minutos
  maxDelaySeconds: 300, // 5 minutos
  blockBatchSize: 5, // Cada bloco de 5 postagens
  blockPauseMinSeconds: 500, // 8.3 minutos
  blockPauseMaxSeconds: 900, // 15 minutos
  humanTypingSimulation: true,
  spintaxEnabled: true,
  maxDailyPosts: 25,
  stopOnCheckpoint: true,
  randomizeGroupOrder: true,
  simulationSpeedMultiplier: 1 // padrão 1x real (com opção para aceleração em modo de teste)
};

export const DEFAULT_LOGS: CampaignLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('pt-BR'),
    groupId: 'grp-1',
    groupName: 'Classificados & Imóveis Zona Sul SP',
    templateId: 'tpl-1',
    templateTitle: 'Lançamento Studio & Aptos Modernos',
    status: 'success',
    postUrl: 'https://facebook.com/groups/imoveiszonasulsp/posts/109847291823456',
    details: 'Postagem publicada no grupo com 3 imagens anexadas.',
    resolvedText: 'Olá pessoal! 🏢 Estamos com as últimas unidades para quem busca alta rentabilidade...',
    delayWaitedSeconds: 184
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 1.8).toLocaleTimeString('pt-BR'),
    groupId: 'grp-2',
    groupName: 'Apartamentos e Casas - Grande SP',
    templateId: 'tpl-1',
    templateTitle: 'Lançamento Studio & Aptos Modernos',
    status: 'success',
    postUrl: 'https://facebook.com/groups/apartamentoscasassp/posts/204958192837465',
    details: 'Postagem publicada no feed do grupo com sucesso.',
    resolvedText: 'Bom dia pessoal! 🏢 Confira as últimas unidades para quem busca praticidade...',
    delayWaitedSeconds: 242
  }
];

const STORAGE_KEYS = {
  TEMPLATES: 'fb_autopost_templates',
  CATEGORIES: 'fb_autopost_categories',
  GROUPS: 'fb_autopost_groups',
  RULES: 'fb_autopost_rules',
  LOGS: 'fb_autopost_logs'
};

export function loadStoredData() {
  try {
    const templates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const categories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    const groups = localStorage.getItem(STORAGE_KEYS.GROUPS);
    const rules = localStorage.getItem(STORAGE_KEYS.RULES);
    const logs = localStorage.getItem(STORAGE_KEYS.LOGS);

    return {
      templates: templates ? JSON.parse(templates) : DEFAULT_TEMPLATES,
      categories: categories ? JSON.parse(categories) : DEFAULT_CATEGORIES,
      groups: groups ? JSON.parse(groups) : DEFAULT_GROUPS,
      rules: rules ? JSON.parse(rules) : DEFAULT_ANTI_BAN_RULES,
      logs: logs ? JSON.parse(logs) : DEFAULT_LOGS
    };
  } catch (e) {
    console.error('Error loading stored data:', e);
    return {
      templates: DEFAULT_TEMPLATES,
      categories: DEFAULT_CATEGORIES,
      groups: DEFAULT_GROUPS,
      rules: DEFAULT_ANTI_BAN_RULES,
      logs: DEFAULT_LOGS
    };
  }
}

export function saveStoredData(key: keyof typeof STORAGE_KEYS, data: unknown) {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data to localStorage:', e);
  }
}
