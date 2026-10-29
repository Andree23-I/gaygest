import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ArrowLeft,
  KanbanSquare,
  Box,
  Bug,
  GitBranch,
  BookOpen,
  DollarSign,
  Megaphone,
  Calendar,
  Download,
  Upload,
  CheckSquare,
  Square,
  Gamepad2,
  ExternalLink,
  Cloud,
  CloudOff,
  RefreshCw,
  PenTool
} from 'lucide-react';
import { Whiteboard } from './Whiteboard';
import type {
  GameProject,
  Task,
  GameAsset,
  BugReport,
  GitLink,
  DocArticle,
  FixedCost,
  OutsourcingContract,
  ExternalEvent,
  MediaContact,
  GameMilestone,
  TaskStatus,
  TaskPriority,
  Department,
  AssetType,
  AssetStatus,
  BugSeverity,
  BugStatus,
  DocCategory,
  EventCategory,
  KeyStatus
} from './types';
import { INITIAL_PROJECTS, createEmptyProject } from './initialData';
import { supabase } from './supabase';

export function App() {
  // Projects collection
  const [projects, setProjects] = useState<GameProject[]>(() => {
    const s = localStorage.getItem('gamedev_projects_v3');
    return s ? JSON.parse(s) : INITIAL_PROJECTS;
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('syncing');

  // Load from Supabase on mount & setup Realtime subscription
  useEffect(() => {
    let isMounted = true;

    async function loadFromSupabase() {
      try {
        setSyncStatus('syncing');
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false });

        if (error) {
          console.warn('Errore lettura Supabase (verificare se la tabella esiste):', error.message);
          setSyncStatus('error');
          return;
        }

        if (data && data.length > 0) {
          const loaded: GameProject[] = data.map(item => item.data);
          if (isMounted) {
            setProjects(loaded);
            setSyncStatus('synced');
          }
        } else {
          // If remote is empty, seed with initial projects
          const initial = INITIAL_PROJECTS;
          for (const p of initial) {
            await supabase.from('projects').upsert({ id: p.id, data: p, updated_at: new Date().toISOString() });
          }
          if (isMounted) setSyncStatus('synced');
        }
      } catch (err) {
        console.error('Supabase connection error:', err);
        setSyncStatus('error');
      }
    }

    loadFromSupabase();

    // Realtime channel
    const channel = supabase
      .channel('projects_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProj: GameProject = payload.new.data;
            setProjects(prev => {
              if (prev.some(p => p.id === newProj.id)) return prev;
              return [newProj, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProj: GameProject = payload.new.data;
            setProjects(prev => prev.map(p => (p.id === updatedProj.id ? updatedProj : p)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setProjects(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper to persist single project to Supabase
  const syncProjectToSupabase = async (proj: GameProject) => {
    try {
      setSyncStatus('syncing');
      const { error } = await supabase.from('projects').upsert({
        id: proj.id,
        data: proj,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.warn('Supabase upsert error:', error.message);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  const deleteProjectFromSupabase = async (id: string) => {
    try {
      setSyncStatus('syncing');
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) setSyncStatus('error');
      else setSyncStatus('synced');
    } catch {
      setSyncStatus('error');
    }
  };

  // Current active project ID. If null, we are on the Project Selection Screen (Hub)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem('gamedev_active_proj_id') || null;
  });

  // Active module tab inside a project
  const [activeTab, setActiveTab] = useState<
    'board' | 'assets' | 'bugs' | 'vcs' | 'wiki' | 'finances' | 'marketing' | 'roadmap' | 'whiteboard'
  >('board');

  // Modal: Create New Project
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjGenre, setNewProjGenre] = useState('');
  const [newProjEngine, setNewProjEngine] = useState('Godot');
  const [newProjGithub, setNewProjGithub] = useState('');
  const [newProjBranch, setNewProjBranch] = useState('main');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Modals inside project
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showFixedCostModal, setShowFixedCostModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showPressModal, setShowPressModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);

  // Filters & State
  const [taskFilterDept, setTaskFilterDept] = useState<string>('all');
  const [docSearch, setDocSearch] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Forms temp state
  const [newTask, setNewTask] = useState<Partial<Task>>({ category: 'Programmazione', priority: 'medium', status: 'backlog' });
  const [newAsset, setNewAsset] = useState<Partial<GameAsset>>({ type: 'Modello 3D', status: 'In Modellazione' });
  const [newBug, setNewBug] = useState<Partial<BugReport>>({ severity: 'Major', status: 'Aperto', platform: 'PC Windows' });
  const [newGit, setNewGit] = useState<Partial<GitLink>>({ repoName: 'game-repo', ciStatus: 'success' });
  const [newDoc, setNewDoc] = useState<Partial<DocArticle>>({ category: 'GDD Dinamico' });
  const [newFixedCost, setNewFixedCost] = useState<Partial<FixedCost>>({ category: 'Software/Licenze', monthlyAmount: 30 });
  const [newContract, setNewContract] = useState<Partial<OutsourcingContract>>({ serviceType: '3D Modeling', status: 'In Corso', paidAmount: 0 });
  const [newEvent, setNewEvent] = useState<Partial<ExternalEvent>>({ category: 'Festival/Showcase (es. Steam Next Fest)', status: 'Pianificato' });
  const [newPress, setNewPress] = useState<Partial<MediaContact>>({ type: 'Streamer Twitch', keyStatus: 'Da Contattare' });
  const [newMilestone, setNewMilestone] = useState<Partial<GameMilestone>>({ phase: 'Vertical Slice', completed: false });

  // Persist projects to localStorage as local cache
  useEffect(() => {
    localStorage.setItem('gamedev_projects_v3', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('gamedev_active_proj_id', activeProjectId);
    } else {
      localStorage.removeItem('gamedev_active_proj_id');
    }
  }, [activeProjectId]);

  // Current project getter and setter
  const currentProject = projects.find(p => p.id === activeProjectId);

  const updateCurrentProject = (updater: (prev: GameProject) => GameProject) => {
    if (!activeProjectId) return;
    setProjects(prev => {
      let targetProj: GameProject | null = null;
      const nextProjects = prev.map(p => {
        if (p.id === activeProjectId) {
          const updated = updater(p);
          targetProj = { ...updated, updatedAt: new Date().toISOString().split('T')[0] };
          return targetProj;
        }
        return p;
      });
      if (targetProj) {
        syncProjectToSupabase(targetProj);
      }
      return nextProjects;
    });
  };

  // Handler: Crea Nuovo Progetto (con template vuoto pronto per inserire le cose)
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;
    const proj = createEmptyProject(newProjTitle, newProjGenre, newProjEngine);
    proj.description = newProjDesc;
    proj.githubRepo = newProjGithub.trim();
    proj.githubBranch = newProjBranch.trim() || 'main';
    setProjects(prev => [proj, ...prev]);
    syncProjectToSupabase(proj);
    setActiveProjectId(proj.id);
    setShowNewProjModal(false);
    setNewProjTitle('');
    setNewProjGenre('');
    setNewProjEngine('Godot');
    setNewProjGithub('');
    setNewProjBranch('main');
    setNewProjDesc('');
  };

  // Handler: Elimina Progetto
  const handleDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questo progetto? Tutti i dati associati andranno persi.')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      deleteProjectFromSupabase(id);
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };



  // Export / Import Multi-Project
  const exportAllProjects = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gamedev_workspace_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importAllProjects = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          setProjects(parsed);
          alert('Progetti importati con successo!');
        } else {
          alert('Formato non valido: deve essere un array di progetti.');
        }
      } catch (err) {
        alert('Errore nella lettura del file JSON');
      }
    };
    reader.readAsText(file);
  };

  // ========================================================
  // SCHERMATA 1: SELEZIONE E CREAZIONE PROGETTI (HUB INIZIALE)
  // ========================================================
  if (!activeProjectId || !currentProject) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        {/* Header semplice da programma desktop */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gamepad2 size={22} color="#3b82f6" /> Gestionale GameDev - Seleziona Progetto
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Scegli un progetto esistente da portare avanti oppure creane uno nuovo.
              </p>
              {syncStatus === 'synced' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  <Cloud size={12} /> Sincronizzato con Cloud
                </span>
              )}
              {syncStatus === 'syncing' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  <RefreshCw size={12} className="spin" /> Sincronizzazione in corso...
                </span>
              )}
              {syncStatus === 'error' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '4px' }} title="Crea la tabella 'projects' su Supabase se non l'hai ancora fatto">
                  <CloudOff size={12} /> Errore Cloud (usando dati locali)
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowNewProjModal(true)}
              className="ui-button ui-button-primary"
            >
              <Plus size={15} /> Nuovo Progetto
            </button>
            <button onClick={exportAllProjects} className="ui-button" title="Esporta file JSON con tutti i progetti">
              <Download size={14} /> Esporta
            </button>
            <label className="ui-button" style={{ cursor: 'pointer' }} title="Importa file JSON">
              <Upload size={14} /> Importa
              <input type="file" accept=".json" onChange={importAllProjects} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Lista Progetti */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {projects.map(proj => {
            const taskTotal = proj.tasks.length;
            const taskDone = proj.tasks.filter(t => t.status === 'done').length;
            const openBugs = proj.bugs.filter(b => b.status !== 'Chiuso').length;

            return (
              <div
                key={proj.id}
                onClick={() => {
                  setActiveProjectId(proj.id);
                  setActiveTab('board');
                }}
                className="ui-panel"
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  transition: 'background-color 0.15s, border-color 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{proj.title}</h2>
                    <span style={{ fontSize: '12px', color: 'var(--color-primary)' }}>{proj.genre || 'Nessun genere'}</span>
                  </div>
                  <button
                    onClick={e => handleDeleteProject(proj.id, e)}
                    className="ui-button"
                    style={{ padding: '3px 6px', color: 'var(--color-danger)', border: 'none', background: 'transparent' }}
                    title="Elimina progetto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {proj.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {proj.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                  <span>Engine: <strong>{proj.engine}</strong></span>
                  <span>Piattaforma: <strong>{proj.targetPlatform}</strong></span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Tasks: <strong style={{ color: '#fff' }}>{taskDone}/{taskTotal}</strong>
                  </span>
                  <span style={{ color: openBugs > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                    {openBugs} Bug aperti
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>Agg: {proj.updatedAt}</span>
                </div>
              </div>
            );
          })}

          {/* Card per creare progetto al volo */}
          <div
            onClick={() => setShowNewProjModal(true)}
            className="ui-panel"
            style={{
              padding: '24px',
              border: '2px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              minHeight: '150px'
            }}
          >
            <Plus size={24} />
            <span style={{ fontWeight: 600 }}>Crea un altro Progetto</span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Genera template vuoto per iniziare</span>
          </div>
        </div>

        {/* Modal: Nuovo Progetto */}
        {showNewProjModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
            <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '440px', width: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                Crea Nuovo Progetto (Template Vuoto)
              </h3>
              <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Nome del Progetto / Gioco *</label>
                  <input
                    type="text"
                    required
                    placeholder="Es. Dungeon Runner, Project Nebula..."
                    value={newProjTitle}
                    onChange={e => setNewProjTitle(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Genere</label>
                    <input
                      type="text"
                      placeholder="Es. Roguelike 2D, FPS, Puzzle"
                      value={newProjGenre}
                      onChange={e => setNewProjGenre(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Game Engine</label>
                    <select
                      value={newProjEngine}
                      onChange={e => setNewProjEngine(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="Godot">Godot Engine</option>
                      <option value="Unity">Unity</option>
                      <option value="Unreal Engine">Unreal Engine</option>
                      <option value="GameMaker">GameMaker</option>
                      <option value="Custom C++ / Rust">Custom C++ / Rust</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      Repository GitHub (Opzionale)
                    </label>
                    <input
                      type="text"
                      placeholder="es. nomeutente/nome-repo"
                      value={newProjGithub}
                      onChange={e => setNewProjGithub(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                      Branch GitHub
                    </label>
                    <input
                      type="text"
                      placeholder="main"
                      value={newProjBranch}
                      onChange={e => setNewProjBranch(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Breve Descrizione / Idea</label>
                  <textarea
                    rows={3}
                    placeholder="Riassunto di base del progetto e del target..."
                    value={newProjDesc}
                    onChange={e => setNewProjDesc(e.target.value)}
                    style={{ width: '100%', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setShowNewProjModal(false)} className="ui-button">Annulla</button>
                  <button type="submit" className="ui-button ui-button-primary">Crea Progetto</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // SCHERMATA 2: GESTIONALE INTERNO DEL PROGETTO SELEZIONATO
  // ========================================================

  // Helpers per calcoli finanziari del progetto corrente
  const monthlyBurn = currentProject.fixedCosts.reduce((sum, item) => sum + (item.monthlyAmount || 0), 0);
  const outsourcingDebt = currentProject.contracts.reduce((sum, c) => sum + Math.max(0, (c.agreedFee || 0) - (c.paidAmount || 0)), 0);
  const netCash = currentProject.cashReserve - outsourcingDebt;
  const runway = monthlyBurn > 0 ? (netCash / monthlyBurn).toFixed(1) : '∞';

  const kanbanColumns: { id: TaskStatus; title: string }[] = [
    { id: 'backlog', title: 'To Do & Backlog' },
    { id: 'in_progress', title: 'In Lavorazione' },
    { id: 'review', title: 'In Revisione / Test QA' },
    { id: 'done', title: 'Completato' }
  ];

  const filteredTasks = currentProject.tasks.filter(t => {
    if (taskFilterDept !== 'all' && t.category !== taskFilterDept) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superiore classica con pulsante per tornare alla selezione progetti */}
      <header
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          {/* Pulsante Torna a Elenco Progetti + Nome Progetto Attuale */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setActiveProjectId(null)}
              className="ui-button"
              title="Torna alla schermata di selezione progetti per crearne un altro o cambiare"
            >
              <ArrowLeft size={14} /> Tutti i Progetti
            </button>

            <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                  {currentProject.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', padding: '1px 5px', border: '1px solid var(--border-color)', borderRadius: '3px' }}>
                  {currentProject.engine}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {currentProject.genre || 'Gestionale Studio'}
                </span>
                {currentProject.githubRepo ? (
                  <a
                    href={`https://github.com/${currentProject.githubRepo.replace(/^https?:\/\/github\.com\//, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#60a5fa',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      background: 'var(--bg-panel)',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      border: '1px solid var(--border-color)'
                    }}
                    title="Apri Repository GitHub"
                  >
                    <GitBranch size={12} /> {currentProject.githubRepo.replace(/^https?:\/\/github\.com\//, '')}
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      const repo = prompt('Inserisci il repository GitHub (es. utente/progetto-gioco):', currentProject.githubRepo || '');
                      if (repo !== null) {
                        updateCurrentProject(p => ({ ...p, githubRepo: repo.trim() }));
                      }
                    }}
                    className="ui-button"
                    style={{ padding: '1px 5px', fontSize: '10px' }}
                    title="Collega repository GitHub per aprire i file degli asset in un click"
                  >
                    + Collega GitHub
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dati rapidi / Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              Tasks: <strong>{currentProject.tasks.filter(t => t.status === 'done').length}/{currentProject.tasks.length}</strong>
            </div>
            <div style={{ color: currentProject.bugs.filter(b => b.status !== 'Chiuso').length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              Bug: <strong>{currentProject.bugs.filter(b => b.status !== 'Chiuso').length} aperti</strong>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              Pista: <strong style={{ color: 'var(--color-success)' }}>{runway} mesi</strong>
            </div>
          </div>
        </div>

        {/* Tab di navigazione tra i 6 moduli */}
        <div style={{ maxWidth: '1440px', margin: '8px auto 0 auto', display: 'flex', gap: '4px', overflowX: 'auto' }}>
          {[
            { id: 'board', label: '1. Kanban Board', icon: KanbanSquare },
            { id: 'assets', label: '1b. Asset Pipeline', icon: Box },
            { id: 'bugs', label: `2. Bug QA (${currentProject.bugs.length})`, icon: Bug },
            { id: 'vcs', label: '3. VCS & Git', icon: GitBranch },
            { id: 'wiki', label: '4. Knowledge Base & GDD', icon: BookOpen },
            { id: 'finances', label: '5. Finanze & Runway', icon: DollarSign },
            { id: 'marketing', label: '6. Marketing & Stampa', icon: Megaphone },
            { id: 'roadmap', label: 'Milestone & Sprint', icon: Calendar },
            { id: 'whiteboard', label: '🎨 Lavagna Live', icon: PenTool }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: active ? 600 : 500,
                  backgroundColor: active ? 'var(--bg-panel)' : 'transparent',
                  color: active ? '#fff' : 'var(--text-muted)',
                  border: '1px solid',
                  borderColor: active ? 'var(--border-color)' : 'transparent',
                  borderBottom: active ? '2px solid var(--color-primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  borderRadius: '3px 3px 0 0',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={14} color={active ? '#60a5fa' : '#94a3b8'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Area Contenuto Modulo Attivo */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', width: '100%', padding: '16px', flex: 1 }}>
        {/* ======================================================== */}
        {/* MODULO 1: KANBAN BOARD */}
        {/* ======================================================== */}
        {activeTab === 'board' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filtra Dipartimento:</span>
                <select
                  value={taskFilterDept}
                  onChange={e => setTaskFilterDept(e.target.value)}
                  style={{ fontSize: '12px' }}
                >
                  <option value="all">Tutti i reparti</option>
                  <option value="Game Design">Game Design</option>
                  <option value="Programmazione">Programmazione</option>
                  <option value="2D/3D Art">2D/3D Art</option>
                  <option value="Audio">Audio</option>
                  <option value="QA & Testing">QA & Testing</option>
                </select>
              </div>

              <button onClick={() => setShowTaskModal(true)} className="ui-button ui-button-primary">
                <Plus size={14} /> Aggiungi Task
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', alignItems: 'start' }}>
              {kanbanColumns.map(col => {
                const colTasks = filteredTasks.filter(t => t.status === col.id);
                return (
                  <div key={col.id} className="ui-panel" style={{ padding: '10px', minHeight: '500px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{col.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--bg-element)', padding: '1px 6px', borderRadius: '3px' }}>
                        {colTasks.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {colTasks.length === 0 ? (
                        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', border: '1px dashed var(--border-color)', borderRadius: '3px' }}>
                          Nessun task in questa colonna
                        </div>
                      ) : (
                        colTasks.map(t => (
                          <div
                            key={t.id}
                            style={{
                              backgroundColor: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)',
                              padding: '10px',
                              borderRadius: '3px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{t.category}</span>
                              <span style={{ color: t.priority === 'urgent' ? 'var(--color-danger)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>
                                {t.priority}
                              </span>
                            </div>

                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{t.title}</div>
                            {t.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.description}</div>}

                            {t.gitBranch && (
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                                branch: {t.gitBranch}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px', fontSize: '11px' }}>
                              <span style={{ color: 'var(--text-muted)' }}>{t.assignee || 'Non assegnato'}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <select
                                  value={t.status}
                                  onChange={e => {
                                    const nextStatus = e.target.value as TaskStatus;
                                    updateCurrentProject(p => ({
                                      ...p,
                                      tasks: p.tasks.map(x => x.id === t.id ? { ...x, status: nextStatus } : x)
                                    }));
                                  }}
                                  style={{ padding: '2px 4px', fontSize: '11px' }}
                                >
                                  <option value="backlog">To Do</option>
                                  <option value="in_progress">In Corso</option>
                                  <option value="review">Review</option>
                                  <option value="done">Done</option>
                                </select>
                                <button
                                  onClick={() => {
                                    updateCurrentProject(p => ({
                                      ...p,
                                      tasks: p.tasks.filter(x => x.id !== t.id)
                                    }));
                                  }}
                                  className="ui-button"
                                  style={{ padding: '2px 4px', color: 'var(--color-danger)' }}
                                  title="Elimina task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO 1b: PIPELINE ASSET */}
        {/* ======================================================== */}
        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Pipeline Asset di Gioco</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tracciamento modelli 3D, sprite, texture, audio e percorsi repository/drive.</p>
              </div>
              <button onClick={() => setShowAssetModal(true)} className="ui-button ui-button-primary">
                <Plus size={14} /> Registra Asset
              </button>
            </div>

            {currentProject.assets.length === 0 ? (
              <div className="ui-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                Nessun asset ancora registrato per questo progetto. Clicca su "+ Registra Asset" per iniziare.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nome Asset</th>
                    <th>Tipo</th>
                    <th>Stato</th>
                    <th>Specifiche Tecniche</th>
                    <th>Percorso / Drive</th>
                    <th>Assegnato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProject.assets.map(ast => (
                    <tr key={ast.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{ast.name}</td>
                      <td>{ast.type}</td>
                      <td>
                        <select
                          value={ast.status}
                          onChange={e => {
                            const val = e.target.value as AssetStatus;
                            updateCurrentProject(p => ({
                              ...p,
                              assets: p.assets.map(a => a.id === ast.id ? { ...a, status: val } : a)
                            }));
                          }}
                          style={{ fontSize: '11px' }}
                        >
                          <option value="Bozza">Bozza</option>
                          <option value="In Modellazione">In Modellazione</option>
                          <option value="Review Tecnica">Review Tecnica</option>
                          <option value="Importato in Engine">Importato in Engine</option>
                          <option value="Approvato">Approvato</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {ast.polyCount && <span>{ast.polyCount} • </span>}
                        {ast.textureResolution && <span>{ast.textureResolution}</span>}
                        {ast.audioFormat && <span>{ast.audioFormat}</span>}
                      </td>
                      <td>
                        {(() => {
                          const rawPath = ast.repoPathOrDrive || '';
                          const isHttp = rawPath.startsWith('http://') || rawPath.startsWith('https://');
                          const cleanPath = rawPath.replace(/^\/+/, '');
                          
                          let directGithubUrl = '';
                          if (currentProject.githubRepo && !isHttp) {
                            const repoClean = currentProject.githubRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
                            const branch = currentProject.githubBranch || 'main';
                            directGithubUrl = `https://github.com/${repoClean}/blob/${branch}/${cleanPath}`;
                          }

                          if (isHttp) {
                            return (
                              <a
                                href={rawPath}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#60a5fa',
                                  textDecoration: 'none',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '11px'
                                }}
                              >
                                <ExternalLink size={12} /> {rawPath.length > 35 ? rawPath.substring(0, 32) + '...' : rawPath}
                              </a>
                            );
                          }

                          if (directGithubUrl) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <a
                                  href={directGithubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    color: '#60a5fa',
                                    textDecoration: 'none',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '11px',
                                    fontWeight: 500
                                  }}
                                  title={`Apri file su GitHub (${directGithubUrl})`}
                                >
                                  <GitBranch size={13} color="#94a3b8" /> {cleanPath} <ExternalLink size={10} color="#94a3b8" />
                                </a>
                                {ast.externalUrl && (
                                  <a
                                    href={ast.externalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: '10px', color: '#a5b4fc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <ExternalLink size={10} /> Link Drive/Esterno
                                  </a>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                                {cleanPath || '—'}
                              </span>
                              {ast.externalUrl && (
                                <a
                                  href={ast.externalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                >
                                  <ExternalLink size={11} /> Drive
                                </a>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>{ast.assignee}</td>
                      <td>
                        <button
                          onClick={() => {
                            updateCurrentProject(p => ({ ...p, assets: p.assets.filter(a => a.id !== ast.id) }));
                          }}
                          className="ui-button"
                          style={{ padding: '2px 5px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO 2: BUG QA & CRASH REPORTER */}
        {/* ======================================================== */}
        {activeTab === 'bugs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Bug Tracking & QA</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Segnalazione errori, passi di riproduzione, stack trace e link a crash reporter.</p>
              </div>
              <button onClick={() => setShowBugModal(true)} className="ui-button ui-button-danger">
                <Plus size={14} /> Segnala Bug
              </button>
            </div>

            {currentProject.bugs.length === 0 ? (
              <div className="ui-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                Nessun bug registrato. Il gioco è pulito o pronto per una sessione di test!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {currentProject.bugs.map(bug => (
                  <div key={bug.id} className="ui-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: bug.severity === 'Blocker' ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                          {bug.id}
                        </span>
                        <span style={{ fontSize: '11px', padding: '1px 5px', border: '1px solid var(--border-color)', borderRadius: '3px' }}>
                          {bug.severity}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {bug.platform} • {bug.buildVersion}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          value={bug.status}
                          onChange={e => {
                            const val = e.target.value as BugStatus;
                            updateCurrentProject(p => ({
                              ...p,
                              bugs: p.bugs.map(b => b.id === bug.id ? { ...b, status: val } : b)
                            }));
                          }}
                          style={{ fontSize: '11px' }}
                        >
                          <option value="Aperto">Aperto</option>
                          <option value="Investigazione">Investigazione</option>
                          <option value="Risolto in Dev">Risolto in Dev</option>
                          <option value="Verificato QA">Verificato QA</option>
                          <option value="Chiuso">Chiuso</option>
                        </select>
                        <button
                          onClick={() => updateCurrentProject(p => ({ ...p, bugs: p.bugs.filter(b => b.id !== bug.id) }))}
                          className="ui-button"
                          style={{ padding: '2px 5px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{bug.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', padding: '6px 8px', borderRadius: '3px' }}>
                      <strong>Passi per riprodurre:</strong> {bug.reproductionSteps}
                    </div>

                    {bug.crashReporterLink && (
                      <div style={{ fontSize: '11px' }}>
                        <a href={bug.crashReporterLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                          Vedi report crash su Sentry/Diagnostics ➔
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO 3: VCS & GIT */}
        {/* ======================================================== */}
        {activeTab === 'vcs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Controllo Versione (VCS / Git)</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Collega commit, branch e pull request ai task di gioco.</p>
              </div>
              <button onClick={() => setShowGitModal(true)} className="ui-button ui-button-primary">
                <Plus size={14} /> Registra Commit
              </button>
            </div>

            {currentProject.gitLinks.length === 0 ? (
              <div className="ui-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                Nessun commit o branch registrato.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Repo</th>
                    <th>Branch</th>
                    <th>Commit</th>
                    <th>Messaggio</th>
                    <th>Autore</th>
                    <th>Rif. Task/Bug</th>
                    <th>CI</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProject.gitLinks.map(g => (
                    <tr key={g.id}>
                      <td style={{ fontWeight: 600 }}>{g.repoName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{g.branchName}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-primary)' }}>#{g.commitHash}</td>
                      <td style={{ color: '#fff' }}>{g.commitMessage}</td>
                      <td>{g.author}</td>
                      <td style={{ color: 'var(--color-warning)' }}>{g.relatedTaskIdOrBugId || '—'}</td>
                      <td>
                        <span style={{ fontSize: '11px', color: g.ciStatus === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {g.ciStatus}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => updateCurrentProject(p => ({ ...p, gitLinks: p.gitLinks.filter(item => item.id !== g.id) }))}
                          className="ui-button"
                          style={{ padding: '2px 5px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO 4: WIKI & GDD DINAMICO */}
        {/* ======================================================== */}
        {activeTab === 'wiki' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Knowledge Base & GDD Dinamico</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Documentazione di gioco, convenzioni codice, lore e linee guida artistiche.</p>
              </div>
              <button onClick={() => setShowDocModal(true)} className="ui-button ui-button-primary">
                <Plus size={14} /> Nuovo Documento
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(400px, 2.5fr)', gap: '12px' }}>
              {/* Lista documenti */}
              <div className="ui-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Cerca documenti..."
                  value={docSearch}
                  onChange={e => setDocSearch(e.target.value)}
                  style={{ width: '100%', fontSize: '12px' }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {currentProject.docs
                    .filter(d => d.title.toLowerCase().includes(docSearch.toLowerCase()))
                    .map(doc => {
                      const isSel = (selectedDocId || currentProject.docs[0]?.id) === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          style={{
                            padding: '8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            backgroundColor: isSel ? 'var(--bg-element)' : 'transparent',
                            border: isSel ? '1px solid var(--border-color)' : '1px solid transparent'
                          }}
                        >
                          <div style={{ fontSize: '11px', color: 'var(--color-primary)' }}>{doc.category}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{doc.title}</div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Lettore / Visualizzatore */}
              {(() => {
                const activeDoc = currentProject.docs.find(d => d.id === (selectedDocId || currentProject.docs[0]?.id));
                if (!activeDoc) {
                  return (
                    <div className="ui-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      Nessun documento presente.
                    </div>
                  );
                }
                return (
                  <div className="ui-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--color-primary)', textTransform: 'uppercase' }}>{activeDoc.category}</span>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{activeDoc.title}</h3>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aggiornato il: {activeDoc.lastUpdated}</div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questo documento?')) {
                            updateCurrentProject(p => ({ ...p, docs: p.docs.filter(d => d.id !== activeDoc.id) }));
                          }
                        }}
                        className="ui-button"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={13} /> Elimina
                      </button>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-app)', padding: '12px', borderRadius: '3px', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5', minHeight: '300px' }}>
                      {activeDoc.content}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO 5: FINANZE & RUNWAY */}
        {/* ======================================================== */}
        {activeTab === 'finances' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Finanze e Runway di Progetto</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tracciamento costi fissi, contratti esterni e mesi di autonomia rimasti.</p>
            </div>

            {/* Schede riassuntive */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div className="ui-panel" style={{ padding: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cassa Totale</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <input
                    type="number"
                    value={currentProject.cashReserve}
                    onChange={e => {
                      const val = Number(e.target.value);
                      updateCurrentProject(p => ({ ...p, cashReserve: val }));
                    }}
                    style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-success)', width: '130px' }}
                  />
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>€</span>
                </div>
              </div>

              <div className="ui-panel" style={{ padding: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Burn Rate Mensile (Fissi)</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-danger)', marginTop: '4px' }}>
                  {monthlyBurn} € / mese
                </div>
              </div>

              <div className="ui-panel" style={{ padding: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Debiti Outsourcing Residui</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '4px' }}>
                  {outsourcingDebt} €
                </div>
              </div>

              <div className="ui-panel" style={{ padding: '12px', borderLeft: '3px solid var(--color-primary)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pista (Runway)</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                  {runway} Mesi
                </div>
              </div>
            </div>

            {/* Split Costi e Contratti */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '14px' }}>
              <div className="ui-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>Costi Fissi Mensili</span>
                  <button onClick={() => setShowFixedCostModal(true)} className="ui-button" style={{ padding: '3px 8px' }}>
                    + Aggiungi
                  </button>
                </div>
                {currentProject.fixedCosts.map(fc => (
                  <div key={fc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 500 }}>{fc.name}</div>
                      <span style={{ color: 'var(--text-dim)' }}>{fc.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: 'var(--color-danger)' }}>{fc.monthlyAmount} €</strong>
                      <button
                        onClick={() => updateCurrentProject(p => ({ ...p, fixedCosts: p.fixedCosts.filter(c => c.id !== fc.id) }))}
                        className="ui-button"
                        style={{ padding: '2px 4px', color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ui-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>Contratti Outsourcing</span>
                  <button onClick={() => setShowContractModal(true)} className="ui-button" style={{ padding: '3px 8px' }}>
                    + Aggiungi
                  </button>
                </div>
                {currentProject.contracts.map(cnt => (
                  <div key={cnt.id} style={{ padding: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong style={{ color: '#fff' }}>{cnt.collaboratorName} ({cnt.serviceType})</strong>
                      <span style={{ color: 'var(--color-warning)' }}>{cnt.paidAmount}€ / {cnt.agreedFee}€</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{cnt.deliverablesSummary}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO 6: MARKETING & STAMPA */}
        {/* ======================================================== */}
        {activeTab === 'marketing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Marketing, Scadenze Esterne & Creator</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Festival Steam, bandi e distribuzione codici di prova ai creatori di contenuti.</p>
            </div>

            {/* Eventi & Scadenze */}
            <div className="ui-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Scadenze Festival, Bandi e Submission</span>
                <button onClick={() => setShowEventModal(true)} className="ui-button" style={{ padding: '3px 8px' }}>
                  + Nuova Scadenza
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                {currentProject.events.map(ev => (
                  <div key={ev.id} style={{ padding: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{ev.title}</div>
                    <div style={{ color: 'var(--color-warning)', marginTop: '2px' }}>Scadenza: {ev.deadlineDate}</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{ev.requirements}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracker Creator */}
            <div className="ui-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#fff' }}>Contatti Creator e Invio Chiavi Gioco</span>
                <button onClick={() => setShowPressModal(true)} className="ui-button" style={{ padding: '3px 8px' }}>
                  + Aggiungi Contatto
                </button>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Canale</th>
                    <th>Tipo</th>
                    <th>Stato Invio</th>
                    <th>Chiave</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {currentProject.pressContacts.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{p.name}</td>
                      <td>{p.outletOrChannel}</td>
                      <td>{p.type}</td>
                      <td>
                        <select
                          value={p.keyStatus}
                          onChange={e => {
                            const val = e.target.value as KeyStatus;
                            updateCurrentProject(proj => ({
                              ...proj,
                              pressContacts: proj.pressContacts.map(item => item.id === p.id ? { ...item, keyStatus: val } : item)
                            }));
                          }}
                          style={{ fontSize: '11px' }}
                        >
                          <option value="Da Contattare">Da Contattare</option>
                          <option value="Contattato / Pitch">Contattato</option>
                          <option value="Chiave Inviata">Chiave Inviata</option>
                          <option value="Copertura Pubblicata">Copertura Pubblicata</option>
                        </select>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-warning)' }}>
                        {p.gameKeyAssigned || '—'}
                      </td>
                      <td>
                        <button
                          onClick={() => updateCurrentProject(proj => ({ ...proj, pressContacts: proj.pressContacts.filter(x => x.id !== p.id) }))}
                          className="ui-button"
                          style={{ padding: '2px 5px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MILESTONE & SPRINT */}
        {/* ======================================================== */}
        {activeTab === 'roadmap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '750px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Milestone di Progetto</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vertical Slice, Alpha, Beta e Submission.</p>
              </div>
              <button onClick={() => setShowMilestoneModal(true)} className="ui-button ui-button-primary">
                <Plus size={14} /> Nuova Milestone
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentProject.milestones.map(m => (
                <div key={m.id} className="ui-panel" style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => {
                      updateCurrentProject(p => ({
                        ...p,
                        milestones: p.milestones.map(item => item.id === m.id ? { ...item, completed: !item.completed } : item)
                      }));
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: m.completed ? 'var(--color-success)' : 'var(--text-dim)' }}
                  >
                    {m.completed ? <CheckSquare size={22} /> : <Square size={22} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>{m.phase}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>• Data: {m.targetDate}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: m.completed ? 'var(--text-muted)' : '#fff', textDecoration: m.completed ? 'line-through' : 'none' }}>
                      {m.title}
                    </div>
                    {m.notes && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.notes}</div>}
                  </div>

                  <button
                    onClick={() => updateCurrentProject(p => ({ ...p, milestones: p.milestones.filter(x => x.id !== m.id) }))}
                    className="ui-button"
                    style={{ padding: '3px 6px', color: 'var(--color-danger)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODULO: LAVAGNA REALTIME / COLLABORATIVA                 */}
        {/* ======================================================== */}
        {activeTab === 'whiteboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PenTool size={18} color="#3b82f6" /> Lavagna Collaborativa in Tempo Reale
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                  Disegna schemi di gioco, level design, appunti grafici e idee simultaneamente con il tuo team.
                </p>
              </div>
            </div>

            <Whiteboard channelId={currentProject.id} />
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODALI GENERICHE DI INSERIMENTO                          */}
      {/* ======================================================== */}

      {/* Modal Task */}
      {showTaskModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '440px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Nuovo Task</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newTask.title) return;
                const t: Task = {
                  id: 't-' + Date.now(),
                  title: newTask.title,
                  description: newTask.description || '',
                  category: (newTask.category as Department) || 'Programmazione',
                  priority: (newTask.priority as TaskPriority) || 'medium',
                  status: (newTask.status as TaskStatus) || 'backlog',
                  assignee: newTask.assignee || 'Io (Dev)',
                  gitBranch: newTask.gitBranch || '',
                  createdAt: new Date().toISOString().split('T')[0]
                };
                updateCurrentProject(p => ({ ...p, tasks: [t, ...p.tasks] }));
                setShowTaskModal(false);
                setNewTask({ category: 'Programmazione', priority: 'medium', status: 'backlog' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Titolo *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Movimento WASD, Sprite nemico..."
                  value={newTask.title || ''}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Reparto</label>
                  <select
                    value={newTask.category}
                    onChange={e => setNewTask({ ...newTask, category: e.target.value as any })}
                    style={{ width: '100%' }}
                  >
                    <option value="Game Design">Game Design</option>
                    <option value="Programmazione">Programmazione</option>
                    <option value="2D/3D Art">2D/3D Art</option>
                    <option value="Audio">Audio</option>
                    <option value="QA & Testing">QA & Testing</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Priorità</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                    style={{ width: '100%' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Descrizione</label>
                <textarea
                  rows={2}
                  value={newTask.description || ''}
                  onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowTaskModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Crea Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asset */}
      {showAssetModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '440px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Registra Asset</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newAsset.name) return;
                const a: GameAsset = {
                  id: 'ast-' + Date.now(),
                  name: newAsset.name,
                  type: (newAsset.type as AssetType) || 'Modello 3D',
                  status: (newAsset.status as AssetStatus) || 'In Modellazione',
                  assignee: newAsset.assignee || 'Artista',
                  polyCount: newAsset.polyCount || '',
                  textureResolution: newAsset.textureResolution || '',
                  repoPathOrDrive: newAsset.repoPathOrDrive || '',
                  externalUrl: newAsset.externalUrl || ''
                };
                updateCurrentProject(p => ({ ...p, assets: [...p.assets, a] }));
                setShowAssetModal(false);
                setNewAsset({ type: 'Modello 3D', status: 'In Modellazione', repoPathOrDrive: '', externalUrl: '' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nome Asset *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Boss Drago, Spada Base..."
                  value={newAsset.name || ''}
                  onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tipo</label>
                  <select
                    value={newAsset.type}
                    onChange={e => setNewAsset({ ...newAsset, type: e.target.value as any })}
                    style={{ width: '100%' }}
                  >
                    <option value="Modello 3D">Modello 3D</option>
                    <option value="Sprite/2D">Sprite/2D</option>
                    <option value="Animazione">Animazione</option>
                    <option value="Traccia Audio/SFX">Audio / Musica</option>
                    <option value="Shader/VFX">Shader / VFX</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assegna a</label>
                  <input
                    type="text"
                    placeholder="Nome artista / membro"
                    value={newAsset.assignee || ''}
                    onChange={e => setNewAsset({ ...newAsset, assignee: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Percorso file nel Repository GitHub o Cartella
                </label>
                <input
                  type="text"
                  placeholder="es. Assets/Models/Characters/Hero.fbx o Audio/BGM/battle.wav"
                  value={newAsset.repoPathOrDrive || ''}
                  onChange={e => setNewAsset({ ...newAsset, repoPathOrDrive: e.target.value })}
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                  💡 Se il progetto ha un repo GitHub collegato, questo percorso diventerà un link cliccabile diretto al file!
                </span>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Link Diretto Esterno (Opzionale: Google Drive, Dropbox, Artstation)
                </label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={newAsset.externalUrl || ''}
                  onChange={e => setNewAsset({ ...newAsset, externalUrl: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Poligoni / Audio Specs</label>
                  <input
                    type="text"
                    placeholder="es. 15k Tris o 48kHz WAV"
                    value={newAsset.polyCount || ''}
                    onChange={e => setNewAsset({ ...newAsset, polyCount: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Texture Res</label>
                  <input
                    type="text"
                    placeholder="es. 2048x2048 PBR"
                    value={newAsset.textureResolution || ''}
                    onChange={e => setNewAsset({ ...newAsset, textureResolution: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAssetModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Salva Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bug */}
      {showBugModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '440px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-danger)' }}>Segnala Bug</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newBug.title) return;
                const b: BugReport = {
                  id: 'BUG-' + Math.floor(100 + Math.random() * 900),
                  title: newBug.title,
                  severity: (newBug.severity as BugSeverity) || 'Major',
                  status: 'Aperto',
                  reportedBy: 'QA',
                  assignee: 'Io (Dev)',
                  platform: (newBug.platform as any) || 'PC Windows',
                  buildVersion: 'v0.1',
                  reproductionSteps: newBug.reproductionSteps || '',
                  createdAt: new Date().toISOString().split('T')[0]
                };
                updateCurrentProject(p => ({ ...p, bugs: [b, ...p.bugs] }));
                setShowBugModal(false);
                setNewBug({ severity: 'Major', platform: 'PC Windows' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Titolo Errore *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Il personaggio si incastra nel muro"
                  value={newBug.title || ''}
                  onChange={e => setNewBug({ ...newBug, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Gravità</label>
                  <select
                    value={newBug.severity}
                    onChange={e => setNewBug({ ...newBug, severity: e.target.value as any })}
                    style={{ width: '100%' }}
                  >
                    <option value="Blocker">Blocker (Crash)</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                    <option value="Tweak/Polishing">Tweak</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Piattaforma</label>
                  <select
                    value={newBug.platform}
                    onChange={e => setNewBug({ ...newBug, platform: e.target.value as any })}
                    style={{ width: '100%' }}
                  >
                    <option value="PC Windows">PC Windows</option>
                    <option value="Steam Deck">Steam Deck</option>
                    <option value="Mac">Mac</option>
                    <option value="Linux">Linux</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Passi per Riprodurre</label>
                <textarea
                  rows={2}
                  value={newBug.reproductionSteps || ''}
                  onChange={e => setNewBug({ ...newBug, reproductionSteps: e.target.value })}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowBugModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-danger">Segnala</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Git */}
      {showGitModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '440px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Registra Commit</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newGit.commitHash || !newGit.commitMessage) return;
                const g: GitLink = {
                  id: 'git-' + Date.now(),
                  repoName: newGit.repoName || 'game-repo',
                  branchName: newGit.branchName || 'main',
                  commitHash: newGit.commitHash,
                  commitMessage: newGit.commitMessage,
                  author: 'Io (Dev)',
                  ciStatus: 'success',
                  timestamp: 'Oggi'
                };
                updateCurrentProject(p => ({ ...p, gitLinks: [g, ...p.gitLinks] }));
                setShowGitModal(false);
                setNewGit({ repoName: 'game-repo' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hash Commit *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. a4c91e"
                  value={newGit.commitHash || ''}
                  onChange={e => setNewGit({ ...newGit, commitHash: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Messaggio *</label>
                <input
                  type="text"
                  required
                  placeholder="feat: add player movement"
                  value={newGit.commitMessage || ''}
                  onChange={e => setNewGit({ ...newGit, commitMessage: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowGitModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Salva Commit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Documento Wiki */}
      {showDocModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '460px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Nuovo Documento GDD / Wiki</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newDoc.title) return;
                const d: DocArticle = {
                  id: 'doc-' + Date.now(),
                  title: newDoc.title,
                  category: (newDoc.category as DocCategory) || 'GDD Dinamico',
                  author: 'Team',
                  summary: newDoc.summary || '',
                  content: newDoc.content || '',
                  tags: [],
                  lastUpdated: new Date().toISOString().split('T')[0]
                };
                updateCurrentProject(p => ({ ...p, docs: [...p.docs, d] }));
                setSelectedDocId(d.id);
                setShowDocModal(false);
                setNewDoc({ category: 'GDD Dinamico' });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Titolo Articolo *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Meccaniche Combattimento, Lore Boss..."
                  value={newDoc.title || ''}
                  onChange={e => setNewDoc({ ...newDoc, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Categoria</label>
                <select
                  value={newDoc.category}
                  onChange={e => setNewDoc({ ...newDoc, category: e.target.value as any })}
                  style={{ width: '100%' }}
                >
                  <option value="GDD Dinamico">GDD Dinamico</option>
                  <option value="Linee Guida Codice">Linee Guida Codice</option>
                  <option value="Art Bible & Stile">Art Bible & Stile</option>
                  <option value="Lore & Dialoghi">Lore & Dialoghi</option>
                  <option value="API Interne & Architettura">API Interne</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Contenuto</label>
                <textarea
                  rows={4}
                  value={newDoc.content || ''}
                  onChange={e => setNewDoc({ ...newDoc, content: e.target.value })}
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowDocModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Crea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Costo Fisso */}
      {showFixedCostModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '380px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Aggiungi Spesa Fissa</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newFixedCost.name || !newFixedCost.monthlyAmount) return;
                const fc: FixedCost = {
                  id: 'fc-' + Date.now(),
                  name: newFixedCost.name,
                  category: (newFixedCost.category as any) || 'Software/Licenze',
                  monthlyAmount: Number(newFixedCost.monthlyAmount)
                };
                updateCurrentProject(p => ({ ...p, fixedCosts: [...p.fixedCosts, fc] }));
                setShowFixedCostModal(false);
                setNewFixedCost({ category: 'Software/Licenze', monthlyAmount: 30 });
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nome Spesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Server, Sentry, Licenza"
                  value={newFixedCost.name || ''}
                  onChange={e => setNewFixedCost({ ...newFixedCost, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Costo al mese (€) *</label>
                <input
                  type="number"
                  required
                  placeholder="50"
                  value={newFixedCost.monthlyAmount || ''}
                  onChange={e => setNewFixedCost({ ...newFixedCost, monthlyAmount: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowFixedCostModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contratto */}
      {showContractModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '400px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Nuovo Contratto Esterno</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newContract.collaboratorName || !newContract.agreedFee) return;
                const c: OutsourcingContract = {
                  id: 'cnt-' + Date.now(),
                  collaboratorName: newContract.collaboratorName,
                  serviceType: (newContract.serviceType as any) || '3D Modeling',
                  agreedFee: Number(newContract.agreedFee),
                  paidAmount: Number(newContract.paidAmount || 0),
                  deliverablesSummary: newContract.deliverablesSummary || '',
                  status: 'In Corso',
                  deadline: '2026-12-31'
                };
                updateCurrentProject(p => ({ ...p, contracts: [...p.contracts, c] }));
                setShowContractModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Collaboratore *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Compositore Freelance"
                  value={newContract.collaboratorName || ''}
                  onChange={e => setNewContract({ ...newContract, collaboratorName: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compenso Totale (€) *</label>
                  <input
                    type="number"
                    required
                    value={newContract.agreedFee || ''}
                    onChange={e => setNewContract({ ...newContract, agreedFee: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Acconto Versato (€)</label>
                  <input
                    type="number"
                    value={newContract.paidAmount || ''}
                    onChange={e => setNewContract({ ...newContract, paidAmount: Number(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cosa deve consegnare</label>
                <input
                  type="text"
                  placeholder="Es. 3 brani musicali o 2 mesh"
                  value={newContract.deliverablesSummary || ''}
                  onChange={e => setNewContract({ ...newContract, deliverablesSummary: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowContractModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Crea</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Evento Scadenza */}
      {showEventModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '400px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Aggiungi Scadenza / Evento</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newEvent.title) return;
                const ev: ExternalEvent = {
                  id: 'evt-' + Date.now(),
                  title: newEvent.title,
                  category: (newEvent.category as EventCategory) || 'Festival/Showcase (es. Steam Next Fest)',
                  deadlineDate: newEvent.deadlineDate || '2027-01-01',
                  status: 'Pianificato',
                  requirements: newEvent.requirements || ''
                };
                updateCurrentProject(p => ({ ...p, events: [...p.events, ev] }));
                setShowEventModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Titolo *</label>
                <input
                  type="text"
                  required
                  placeholder="Steam Next Fest, Bando..."
                  value={newEvent.title || ''}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Data Scadenza</label>
                <input
                  type="text"
                  placeholder="15 Gennaio 2027"
                  value={newEvent.deadlineDate || ''}
                  onChange={e => setNewEvent({ ...newEvent, deadlineDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowEventModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Aggiungi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contatto Stampa */}
      {showPressModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '400px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Aggiungi Creator / Stampa</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newPress.name) return;
                const p: MediaContact = {
                  id: 'med-' + Date.now(),
                  name: newPress.name,
                  outletOrChannel: newPress.outletOrChannel || '',
                  type: (newPress.type as any) || 'Streamer Twitch',
                  keyStatus: 'Da Contattare',
                  gameKeyAssigned: newPress.gameKeyAssigned || ''
                };
                updateCurrentProject(proj => ({ ...proj, pressContacts: [...proj.pressContacts, p] }));
                setShowPressModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nome Creator / Testata *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome Canale o Giornalista"
                  value={newPress.name || ''}
                  onChange={e => setNewPress({ ...newPress, name: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chiave Assegnata</label>
                <input
                  type="text"
                  placeholder="STEAM-KEY-XXXX"
                  value={newPress.gameKeyAssigned || ''}
                  onChange={e => setNewPress({ ...newPress, gameKeyAssigned: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowPressModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Milestone */}
      {showMilestoneModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div className="ui-panel" style={{ backgroundColor: 'var(--bg-panel)', maxWidth: '400px', width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Nuova Milestone</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newMilestone.title) return;
                const m: GameMilestone = {
                  id: 'ms-' + Date.now(),
                  title: newMilestone.title,
                  targetDate: newMilestone.targetDate || 'TBD',
                  completed: false,
                  notes: newMilestone.notes || '',
                  phase: (newMilestone.phase as any) || 'Vertical Slice'
                };
                updateCurrentProject(p => ({ ...p, milestones: [...p.milestones, m] }));
                setShowMilestoneModal(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nome Milestone *</label>
                <input
                  type="text"
                  required
                  placeholder="Es. Vertical Slice, Demo Giocabile"
                  value={newMilestone.title || ''}
                  onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fase</label>
                <select
                  value={newMilestone.phase}
                  onChange={e => setNewMilestone({ ...newMilestone, phase: e.target.value as any })}
                  style={{ width: '100%' }}
                >
                  <option value="Vertical Slice">Vertical Slice</option>
                  <option value="Alpha">Alpha</option>
                  <option value="Beta">Beta</option>
                  <option value="Playtest Pubblico">Playtest Pubblico</option>
                  <option value="Steam Submission / Launch">Steam Submission</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowMilestoneModal(false)} className="ui-button">Annulla</button>
                <button type="submit" className="ui-button ui-button-primary">Crea</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
