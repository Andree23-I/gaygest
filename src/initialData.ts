import type {
  GameProject,
  TeamMember
} from './types';

export const DEFAULT_MEMBERS: TeamMember[] = [
  { id: 'm-1', name: 'Io (Dev)', role: 'Lead Programmer', avatarColor: '#3b82f6', skills: ['Code', 'Engine'] },
  { id: 'm-2', name: 'Artista', role: '2D/3D Artist', avatarColor: '#ec4899', skills: ['Modellazione', 'Texture'] },
  { id: 'm-3', name: 'Audio/Music', role: 'Sound & Composer', avatarColor: '#eab308', skills: ['SFX', 'Musica'] },
  { id: 'm-4', name: 'Game Designer', role: 'Design & QA', avatarColor: '#10b981', skills: ['GDD', 'Testing'] }
];

// Funzione generatrice di un nuovo template di progetto vuoto
export function createEmptyProject(title: string, genre: string = '', engine: string = 'Godot / Unity'): GameProject {
  const now = new Date().toISOString().split('T')[0];
  return {
    id: 'proj-' + Date.now(),
    title: title || 'Nuovo Progetto Gioco',
    genre: genre || 'Genere non specificato',
    engine: engine || 'Engine',
    targetPlatform: 'PC / Steam',
    description: '',
    githubRepo: '',
    githubBranch: 'main',
    createdAt: now,
    updatedAt: now,
    
    // Tutti i 6 moduli partono vuoti o con scheletro pronto
    tasks: [],
    assets: [],
    bugs: [],
    gitLinks: [],
    docs: [
      {
        id: 'doc-init',
        title: 'Documento Iniziale di Design (GDD)',
        category: 'GDD Dinamico',
        author: 'Team',
        summary: 'Bozza iniziale per delineare l\'idea e le meccaniche.',
        content: '# Visione del Gioco\nDescrivi qui l\'idea principale, il target e i punti di forza.',
        tags: ['GDD', 'Bozza'],
        lastUpdated: now
      }
    ],
    cashReserve: 0,
    fixedCosts: [],
    contracts: [],
    events: [],
    pressContacts: [],
    milestones: [
      {
        id: 'ms-init-1',
        title: 'Prototipo Iniziale Giocabile',
        targetDate: 'TBD',
        completed: false,
        phase: 'Vertical Slice',
        notes: 'Primo test dei comandi e loop di base.'
      }
    ],
    members: DEFAULT_MEMBERS
  };
}

// Progetti di default iniziali (uno vuoto/base e uno demo per riferimento)
export const INITIAL_PROJECTS: GameProject[] = [
  {
    id: 'proj-demo-1',
    title: 'Project Chrono Shard',
    genre: 'Action RPG / Sci-Fi Fantasy',
    engine: 'Unity / C#',
    targetPlatform: 'PC Windows & Steam Deck',
    description: 'Gioco action con combattimento a frequenze elementali e manipolazione temporale.',
    githubRepo: 'game-team/chrono-shard',
    githubBranch: 'main',
    createdAt: '2026-10-20',
    updatedAt: '2026-10-29',
    cashReserve: 12500,
    members: DEFAULT_MEMBERS,
    tasks: [
      {
        id: 't-1',
        title: 'Sistema movimento e combo melee base',
        description: 'Input buffer per attacchi leggeri e finestra di parry.',
        assignee: 'Io (Dev)',
        category: 'Programmazione',
        status: 'in_progress',
        priority: 'high',
        createdAt: '2026-10-25'
      },
      {
        id: 't-2',
        title: 'Modello 3D Boss Guardiano',
        description: 'Mesh low-poly ottimizzata e texture PBR.',
        assignee: 'Artista',
        category: '2D/3D Art',
        status: 'in_progress',
        priority: 'urgent',
        createdAt: '2026-10-26'
      }
    ],
    assets: [
      {
        id: 'ast-1',
        name: 'Boss Guardiano Antico',
        type: 'Modello 3D',
        status: 'In Modellazione',
        assignee: 'Artista',
        polyCount: '28.000 Tris',
        textureResolution: '2048x2048 PBR',
        repoPathOrDrive: 'Assets/Models/BossGuardian.fbx'
      }
    ],
    bugs: [
      {
        id: 'BUG-01',
        title: 'Crash se il giocatore muore durante il caricamento',
        severity: 'Blocker',
        status: 'Investigazione',
        reportedBy: 'Game Designer',
        assignee: 'Io (Dev)',
        platform: 'PC Windows',
        buildVersion: 'v0.1.2',
        reproductionSteps: 'Prendere danno nell\'istante esatto dell\'apertura del portale.',
        createdAt: '2026-10-28'
      }
    ],
    gitLinks: [
      {
        id: 'git-1',
        repoName: 'chrono-repo',
        branchName: 'main',
        commitHash: '8b41a9',
        commitMessage: 'fix(combat): add parry window timer',
        author: 'Io (Dev)',
        relatedTaskIdOrBugId: 't-1',
        ciStatus: 'success',
        timestamp: 'Ieri'
      }
    ],
    docs: [
      {
        id: 'doc-1',
        title: 'GDD: Core Loop & Meccanica Resonanza',
        category: 'GDD Dinamico',
        author: 'Game Designer',
        summary: 'Regole sul combattimento e Break dei nemici.',
        content: '# Resonanza\nOgni nemico ha uno scudo con frequenza cromatica.',
        tags: ['GDD'],
        lastUpdated: '2026-10-28'
      }
    ],
    fixedCosts: [
      { id: 'fc-1', name: 'Server build & Sentry', category: 'Server/Cloud', monthlyAmount: 60 }
    ],
    contracts: [],
    events: [
      {
        id: 'evt-1',
        title: 'Steam Next Fest (Registrazione)',
        category: 'Festival/Showcase (es. Steam Next Fest)',
        deadlineDate: '2027-01-15',
        status: 'Pianificato',
        requirements: 'Build giocabile con 1 livello completo.'
      }
    ],
    pressContacts: [],
    milestones: [
      {
        id: 'ms-1',
        title: 'Prototipo Funzionante (Vertical Slice)',
        targetDate: '15 Dicembre 2026',
        completed: false,
        phase: 'Vertical Slice',
        notes: 'Primo boss e combattimento completi.'
      }
    ]
  }
];
