export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type Department = 'Game Design' | 'Programmazione' | '2D/3D Art' | 'Audio' | 'QA & Testing';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  category: Department;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  gitBranch?: string;
  commitHash?: string;
  prLink?: string;
  buildVersion?: string;
  createdAt: string;
}

export type AssetType = 'Modello 3D' | 'Sprite/2D' | 'Animazione' | 'Traccia Audio/SFX' | 'Shader/VFX';
export type AssetStatus = 'Bozza' | 'In Modellazione' | 'Review Tecnica' | 'Importato in Engine' | 'Approvato';

export interface GameAsset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  assignee: string;
  polyCount?: string;
  textureResolution?: string;
  audioFormat?: string;
  fileSpecs?: string;
  repoPathOrDrive: string;
  externalUrl?: string; // URL diretto opzionale (es. Google Drive, Dropbox, ArtStation)
  dependencies?: string;
  notes?: string;
}

export type BugSeverity = 'Blocker' | 'Major' | 'Minor' | 'Tweak/Polishing';
export type BugStatus = 'Aperto' | 'Investigazione' | 'Risolto in Dev' | 'Verificato QA' | 'Chiuso';

export interface BugReport {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  reportedBy: string;
  assignee: string;
  platform: 'PC Windows' | 'Mac' | 'Linux' | 'Steam Deck' | 'Console' | 'Mobile';
  buildVersion: string;
  reproductionSteps: string;
  stackTraceOrLog?: string;
  crashReporterLink?: string;
  fixedInCommit?: string;
  createdAt: string;
}

export interface GitLink {
  id: string;
  repoName: string;
  branchName: string;
  commitHash: string;
  commitMessage: string;
  author: string;
  relatedTaskIdOrBugId?: string;
  prUrl?: string;
  ciStatus: 'success' | 'failed' | 'pending';
  timestamp: string;
}

export type DocCategory = 'GDD Dinamico' | 'Linee Guida Codice' | 'Art Bible & Stile' | 'Lore & Dialoghi' | 'API Interne & Architettura';

export interface DocArticle {
  id: string;
  title: string;
  category: DocCategory;
  author: string;
  summary: string;
  content: string;
  tags: string[];
  lastUpdated: string;
}

export interface FixedCost {
  id: string;
  name: string;
  category: 'Software/Licenze' | 'Server/Cloud' | 'Ufficio/Attrezzatura' | 'Compenso/Stipendio' | 'Altro';
  monthlyAmount: number;
}

export interface OutsourcingContract {
  id: string;
  collaboratorName: string;
  serviceType: 'Compositore/Audio' | '3D Modeling' | 'Concept Art' | 'Traduzione/Localizzazione' | 'Doppiaggio' | 'Animazione' | 'Altro';
  agreedFee: number;
  paidAmount: number;
  deliverablesSummary: string;
  status: 'In Corso' | 'Deliverable Consegnato' | 'Completato & Saldato';
  deadline: string;
  contractDocUrl?: string;
}

export type EventCategory = 'Festival/Showcase (es. Steam Next Fest)' | 'Bando/Fondo Regionale' | 'Publisher Pitch' | 'Embargo Stampa' | 'Devlog/Social';

export interface ExternalEvent {
  id: string;
  title: string;
  category: EventCategory;
  deadlineDate: string;
  status: 'Pianificato' | 'Materiali Pronti' | 'Inviato / Sottomesso' | 'Accettato' | 'Archiviato';
  requirements: string;
  notes?: string;
}

export type KeyStatus = 'Da Contattare' | 'Contattato / Pitch' | 'Chiave Inviata' | 'Copertura Pubblicata' | 'Declinato / Nessuna Risposta';

export interface MediaContact {
  id: string;
  name: string;
  outletOrChannel: string;
  type: 'Streamer Twitch' | 'YouTuber' | 'Giornalista / Testata' | 'TikToker / Creator';
  followersOrReach?: string;
  keyStatus: KeyStatus;
  gameKeyAssigned?: string;
  coverageLink?: string;
  notes?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  skills: string[];
  discord?: string;
}

export interface GameMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
  notes: string;
  phase: 'Vertical Slice' | 'Alpha' | 'Beta' | 'Playtest Pubblico' | 'Steam Submission / Launch';
}

// Struttura di un Progetto completo (Multi-Project)
export interface GameProject {
  id: string;
  title: string;
  genre: string;
  engine: string;
  targetPlatform: string;
  description: string;
  githubRepo?: string; // Es. "username/repository-gioco"
  githubBranch?: string; // Es. "main" o "master"
  createdAt: string;
  updatedAt: string;
  
  // Dati dei 6 moduli per questo specifico progetto
  tasks: Task[];
  assets: GameAsset[];
  bugs: BugReport[];
  gitLinks: GitLink[];
  docs: DocArticle[];
  cashReserve: number;
  fixedCosts: FixedCost[];
  contracts: OutsourcingContract[];
  events: ExternalEvent[];
  pressContacts: MediaContact[];
  milestones: GameMilestone[];
  members: TeamMember[];
}
