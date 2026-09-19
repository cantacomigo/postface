export interface PostTemplate {
  id: string;
  title: string;
  content: string; // Supports Spintax: {Olá|Oi|Bom dia} {amigos|pessoal}, veja isso...
  mediaType: 'none' | 'images' | 'video';
  images: string[]; // up to 10 image URLs/base64
  videoUrl?: string;
  focusType: 'image_title' | 'standard' | 'text_only';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupCategory {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface FacebookGroup {
  id: string;
  fbId: string;
  name: string;
  url: string;
  categoryId: string;
  privacy: 'public' | 'private';
  membersCount: number;
  status: 'active' | 'paused' | 'review_required';
  lastPostedAt?: string;
  notes?: string;
}

export interface AntiBanRules {
  minDelaySeconds: number; // e.g. 120
  maxDelaySeconds: number; // e.g. 300
  blockBatchSize: number; // e.g. 5 posts
  blockPauseMinSeconds: number; // e.g. 500
  blockPauseMaxSeconds: number; // e.g. 900
  humanTypingSimulation: boolean; // Random keystroke delays (40-120ms)
  spintaxEnabled: boolean; // Dynamic variations per post
  maxDailyPosts: number; // e.g. 25
  stopOnCheckpoint: boolean; // Instantly abort if Facebook shows Captcha/Checkpoint
  randomizeGroupOrder: boolean;
  simulationSpeedMultiplier: number; // 1 for real 1:1, or higher for demo/testing
}

export interface CampaignLog {
  id: string;
  timestamp: string;
  groupId: string;
  groupName: string;
  templateId: string;
  templateTitle: string;
  status: 'success' | 'failed' | 'paused_batch' | 'checkpoint_alert' | 'skipped';
  postUrl?: string;
  details: string;
  resolvedText: string;
  delayWaitedSeconds: number;
}

export interface ActiveCampaign {
  id: string;
  name: string;
  templateId: string;
  categoryIds: string[];
  selectedGroupIds: string[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'aborted';
  antiBanRules: AntiBanRules;
  currentIndex: number;
  totalGroups: number;
  successCount: number;
  failedCount: number;
  postsInCurrentBatch: number;
  nextPostCountdown: number; // seconds remaining
  currentPhaseText: string; // "Aguardando delay seguro...", "Em pausa de lote...", "Publicando..."
  startedAt?: string;
  completedAt?: string;
}
