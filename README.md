# GameDev Studio Suite - Sistema Gestionale per Sviluppo Videogiochi 🎮

Uno stack integrato e modulare pensato per team indie e gamedev per coordinare produzione, arte, testing, finanze e marketing.

L'applicazione è attiva su:
👉 **[http://localhost:5173/](http://localhost:5173/)**

---

## 🏗️ Architettura dei 6 Moduli Integrati

### 1. Project Management e Tracciamento Asset
- **Kanban Board Multi-Dipartimento**: Visualizzazione suddivisa per *Game Design*, *Programmazione*, *2D/3D Art*, *Audio*, *QA & Testing*. Filtri per persona e priorità (da *Low* a *Urgent 🔥*).
- **Pipeline degli Asset Dedicata**: Schede per modelli 3D, sprite, animazioni, tracce musicali e shader VFX. Con budget poligonale (*Tris*), risoluzione texture PBR, formati audio (*48kHz WAV*), dipendenze e percorsi repository/Drive.
- **Milestone & Sprint**: Tracciamento delle scadenze chiave (*Vertical Slice*, *Alpha*, *Beta*, *Playtest Pubblico*, *Submission a Steam*).

### 2. Bug Tracking & QA Integrato
- **Schede Bug Dettagliate**: Gravità (*Blocker*, *Major*, *Minor*, *Tweak*), passi di riproduzione, piattaforma (*PC Windows, Steam Deck, Console, Mac/Linux*), versione build e commit di fix.
- **Integrazione Crash Reporter**: Collegamento e link diretti agli errori catturati da *Sentry*, *Unity Cloud Diagnostics*, ecc., con visualizzazione del log / stack trace.

### 3. Integrazione Controllo Versione (VCS - Git / Perforce / Plastic)
- **Registro Commit, Branch e Pull Request**: Ogni commit riporta repository, branch, autore, hash, stato CI (*success/pending/failed*) e link diretto alla PR associata al task o al bug.

### 4. Gestione Documentale & GDD Dinamico (Knowledge Base)
- **Wiki Interna Integrata**: Navigatore con ricerca istantanea tra *GDD Dinamico*, *Linee Guida Codice* (convenzioni, GC-free), *Art Bible* (budget poligonali e convenzioni naming texture), *Lore* e *API Interne*.

### 5. Finanze di Progetto e Runway
- **Calcolo Pista Finanziaria (Runway)**: Calcolo automatico in mesi di autonomia (`Cassa Netta / Burn Rate Mensile`).
- **Burn Rate Mensile**: Monitoraggio dei costi fissi (licenze Adobe, server cloud Sentry/Git LFS, audio middleware FMOD, compensi base).
- **Gestione Contratti & Outsourcing**: Collaboratori esterni (compositore, 3D artist, localizzazione), compensi concordati, acconti versati, stato deliverable e link ai contratti firmati.

### 6. Marketing, Community & Scadenze Esterne
- **Calendario Scadenze Esterne**: Monitoraggio festival (*Steam Next Fest*), bandi e finanziamenti regionali/ministeriali, pitch per publisher e date di embargo stampa.
- **Tracker Contatti Stampa e Content Creator**: Tabella con Streamer Twitch, YouTuber, giornalisti e creator, reach/followers, stato della chiave e codice seriale assegnato.

---

## 💾 Persistenza & Backup Completo
- Salvataggio automatico continuo in `localStorage`.
- Pulsanti **"Backup Studio"** e **"Importa"** nella barra in alto per salvare l'intero database di tutti e 6 i moduli in un unico file `.json` condivisibile con il team su Discord o Drive.
