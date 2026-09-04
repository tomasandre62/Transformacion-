import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Database,
  Download,
  Eye,
  Gauge,
  Heart,
  Home,
  Inbox,
  Layers3,
  Lightbulb,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings2,
  Sparkles,
  Target,
  ThumbsUp,
  UserRound,
  Users,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'
import { createIdea, getDatabase, patchIdea, resetDemoDatabase, toggleIdeaSupport } from './services/api'
import cofaceLogo from './assets/coface-for-trade.png'

const currentUser = {
  id: 'demo-tomas',
  name: 'Tomás R.',
  initials: 'TR',
  area: 'Transformación',
}

const ideaTypes = [
  { id: 'Idea', title: 'Tengo una idea', helper: 'Sé qué podríamos hacer mejor', icon: Lightbulb },
  { id: 'Problema', title: 'Tengo un problema', helper: 'Algo del proceso no funciona bien', icon: MessageSquareText },
  { id: 'Repetitiva', title: 'Hago algo repetitivo', helper: 'Me gustaría dejar de hacerlo manualmente', icon: RefreshCw },
  { id: 'Automatizable', title: 'Podría automatizarse', helper: 'Veo una oportunidad con tecnología o IA', icon: Bot },
]

const areas = ['Operaciones', 'Comercial', 'Finanzas', 'Claims', 'People', 'Legal & Compliance', 'IT', 'Transformación', 'Otro']
const benefits = ['Tiempo', 'Cliente', 'Calidad', 'Riesgo', 'Costo', 'Experiencia', 'Servicio', 'Decisión']
const statuses = ['Recibida', 'En evaluación', 'Priorizada', 'En desarrollo', 'Implementada', 'No priorizada']

const statusClass = {
  Recibida: 'neutral',
  'En evaluación': 'amber',
  Priorizada: 'blue',
  'En desarrollo': 'purple',
  Implementada: 'green',
  'No priorizada': 'gray',
}

const statusNotes = {
  Recibida: 'La idea quedó registrada y está esperando una primera revisión del equipo de Transformación.',
  'En evaluación': 'Estamos validando impacto, alcance, duplicidades y factibilidad antes de priorizar.',
  Priorizada: 'La oportunidad fue seleccionada para discovery o planificación.',
  'En desarrollo': 'La iniciativa se encuentra en ejecución o validación de solución.',
  Implementada: 'La mejora fue implementada. El siguiente paso es medir el impacto conseguido.',
  'No priorizada': 'La idea sigue registrada, pero no será trabajada por ahora. Puede reevaluarse más adelante.',
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function formatSync(value) {
  if (!value) return 'sin sincronizar'
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value))
}

function App() {
  const [page, setPage] = useState('home')
  const [database, setDatabase] = useState(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [initialType, setInitialType] = useState('Idea')
  const [selectedIdeaId, setSelectedIdeaId] = useState(null)
  const [toast, setToast] = useState(null)
  const [busyKey, setBusyKey] = useState('')
  const [loadError, setLoadError] = useState('')

  const ideas = database?.ideas || []
  const selectedIdea = ideas.find(i => i.id === selectedIdeaId) || null

  useEffect(() => {
    let alive = true
    async function load(silent = false) {
      try {
        const next = await getDatabase()
        if (!alive) return
        acceptDatabase(next)
        setLoadError('')
      } catch (error) {
        if (!alive) return
        if (!silent) setLoadError(error.message)
      }
    }
    load()
    const interval = setInterval(() => load(true), 15000)
    const onVisible = () => document.visibilityState === 'visible' && load(true)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timeout)
  }, [toast])

  function flash(message, tone = 'success') {
    setToast({ message, tone })
  }

  function acceptDatabase(next) {
    setDatabase(previous => {
      if (!previous) return next
      const previousTime = Date.parse(previous.updatedAt || 0) || 0
      const nextTime = Date.parse(next?.updatedAt || 0) || 0
      return nextTime >= previousTime ? next : previous
    })
  }

  function openSubmit(type = 'Idea') {
    setInitialType(type)
    setShowSubmit(true)
  }

  function openDetail(id) {
    setSelectedIdeaId(id)
  }

  async function reloadDatabase() {
    setBusyKey('reload')
    try {
      const next = await getDatabase()
      acceptDatabase(next)
      flash('Base JSON recargada desde el servidor.', 'info')
    } catch (error) {
      flash(error.message, 'error')
    } finally {
      setBusyKey('')
    }
  }

  async function addIdea(payload) {
    if (busyKey) return
    setBusyKey('create')
    try {
      const response = await createIdea(payload)
      acceptDatabase(response.database)
      setShowSubmit(false)
      setPage('my')
      flash(`${response.idea.id} fue registrada en data/db.json.`)
    } catch (error) {
      flash(error.message, 'error')
    } finally {
      setBusyKey('')
    }
  }

  async function toggleSupport(id) {
    if (busyKey === `support:${id}`) return
    setBusyKey(`support:${id}`)
    try {
      const response = await toggleIdeaSupport(id)
      acceptDatabase(response.database)
      flash(response.supported ? 'Apoyaste esta idea.' : 'Quitaste tu apoyo.', 'info')
    } catch (error) {
      flash(error.message, 'error')
    } finally {
      setBusyKey('')
    }
  }

  async function updateIdea(id, patch) {
    setBusyKey(`update:${id}`)
    try {
      const response = await patchIdea(id, patch)
      acceptDatabase(response.database)
      if (patch.status) flash(`Estado actualizado a “${patch.status}”.`)
      else flash('Priorización actualizada.', 'info')
    } catch (error) {
      flash(error.message, 'error')
    } finally {
      setBusyKey('')
    }
  }

  async function restoreDemo() {
    if (!window.confirm('Esto reemplazará data/db.json por los datos iniciales del demo. ¿Continuar?')) return
    setBusyKey('reset')
    try {
      const restored = await resetDemoDatabase()
      acceptDatabase(restored)
      setSelectedIdeaId(null)
      flash('data/db.json fue restaurado con el dataset inicial.')
    } catch (error) {
      flash(error.message, 'error')
    } finally {
      setBusyKey('')
    }
  }

  if (!database && !loadError) {
    return <div className="app-loading"><div className="loading-mark">coface</div><div className="loading-spinner"/><p>Conectando con la base de ideas…</p></div>
  }

  if (!database && loadError) {
    return <div className="app-loading error-state"><Database size={30}/><h1>No pudimos abrir la base de ideas</h1><p>{loadError}</p><button className="primary" onClick={() => window.location.reload()}><RefreshCw size={17}/> Reintentar</button><small>Comprueba que ejecutaste <code>npm run dev</code> para iniciar frontend + servidor JSON.</small></div>
  }

  return (
    <div className="app-shell">
      <Header page={page} setPage={setPage} openSubmit={() => openSubmit()} />
      <main>
        {page === 'home' && <HomePage ideas={ideas} setPage={setPage} openSubmit={openSubmit} toggleSupport={toggleSupport} openDetail={openDetail} />}
        {page === 'ideas' && <IdeasPage ideas={ideas} toggleSupport={toggleSupport} openSubmit={() => openSubmit()} openDetail={openDetail} />}
        {page === 'my' && <MyIdeasPage ideas={ideas} openSubmit={() => openSubmit()} openDetail={openDetail} />}
        {page === 'admin' && (
          <AdminPage
            ideas={ideas}
            database={database}
            updateIdea={updateIdea}
            openDetail={openDetail}
            restoreDemo={restoreDemo}
            reloadDatabase={reloadDatabase}
            busyKey={busyKey}
          />
        )}
      </main>
      <Footer database={database} />
      {showSubmit && <SubmitIdea initialType={initialType} onClose={() => !busyKey && setShowSubmit(false)} onSubmit={addIdea} submitting={busyKey === 'create'} />}
      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          liked={selectedIdea.supportedBy?.includes(currentUser.id)}
          onClose={() => setSelectedIdeaId(null)}
          onSupport={() => toggleSupport(selectedIdea.id)}
        />
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

function Header({ page, setPage, openSubmit }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={() => setPage('home')} aria-label="Ir al inicio">
          <img className="brand-logo" src={cofaceLogo} alt="Coface for trade" />
        </button>
        <div className="product-name"><span>Transforma</span><strong>+</strong></div>
        <nav className="nav desktop-nav">
          <NavButton active={page === 'home'} icon={Home} onClick={() => setPage('home')}>Inicio</NavButton>
          <NavButton active={page === 'ideas'} icon={Inbox} onClick={() => setPage('ideas')}>Ideas</NavButton>
          <NavButton active={page === 'my'} icon={CircleUserRound} onClick={() => setPage('my')}>Mis ideas</NavButton>
          <NavButton active={page === 'admin'} icon={BarChart3} onClick={() => setPage('admin')}>Transformación</NavButton>
        </nav>
        <div className="demo-user" title="Usuario de demostración">
          <span>{currentUser.initials}</span>
          <div><strong>{currentUser.name}</strong><small>{currentUser.area}</small></div>
        </div>
        <button className="primary compact" onClick={openSubmit}><Plus size={17}/> Nueva idea</button>
      </div>
      <nav className="nav mobile-nav">
        <NavButton active={page === 'home'} icon={Home} onClick={() => setPage('home')}>Inicio</NavButton>
        <NavButton active={page === 'ideas'} icon={Inbox} onClick={() => setPage('ideas')}>Ideas</NavButton>
        <NavButton active={page === 'my'} icon={CircleUserRound} onClick={() => setPage('my')}>Mías</NavButton>
        <NavButton active={page === 'admin'} icon={BarChart3} onClick={() => setPage('admin')}>Transformación</NavButton>
      </nav>
    </header>
  )
}

function NavButton({ active, icon: Icon, children, onClick }) {
  return <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}><Icon size={17}/><span>{children}</span></button>
}

function HomePage({ ideas, setPage, openSubmit, toggleSupport, openDetail }) {
  const implemented = ideas.filter(i => i.status === 'Implementada')
  const active = ideas.filter(i => ['En evaluación', 'Priorizada', 'En desarrollo'].includes(i.status))
  const hours = implemented.reduce((sum, i) => sum + (i.hours || 0), 0)
  return (
    <>
      <section className="hero">
        <div className="hero-arc hero-arc-one" />
        <div className="hero-arc hero-arc-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={16}/> TRANSFORMACIÓN HECHA POR TODOS</div>
            <h1>Tú conoces tu trabajo<br/><span>mejor que nadie.</span></h1>
            <p>Ayúdanos a encontrar oportunidades para hacer nuestros procesos más simples, rápidos e inteligentes. No necesitas tener la solución: cuéntanos qué mejorarías.</p>
            <div className="hero-actions">
              <button className="primary large" onClick={() => openSubmit('Idea')}>Compartir una idea <ArrowRight size={19}/></button>
              <button className="secondary large" onClick={() => setPage('ideas')}>Explorar ideas</button>
            </div>
            <div className="trust-row">
              <span><Check size={15}/> 2 minutos</span>
              <span><Check size={15}/> Sin business case</span>
              <span><Check size={15}/> Seguimiento visible</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="challenge-card">
              <div className="challenge-top"><Target size={21}/><span>CHALLENGE DEL MES</span></div>
              <h3>¿Qué tarea repetitiva te gustaría no volver a hacer manualmente?</h3>
              <p>Piensa en ese Excel, correo, validación o carga que haces una y otra vez.</p>
              <button className="challenge-action" onClick={() => openSubmit('Repetitiva')}>Contar mi caso <ArrowRight size={17}/></button>
            </div>
            <div className="pulse-card">
              <div><span className="pulse-number">{ideas.length}</span><span className="pulse-label">ideas registradas</span></div>
              <div className="mini-bar"><span style={{ width: `${Math.min(100, active.length * 15)}%` }} /></div>
              <p>{active.length} oportunidades están siendo evaluadas, priorizadas o desarrolladas.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-heading center">
          <span className="kicker">EMPEZAR ES FÁCIL</span>
          <h2>¿Qué estás viendo en tu día a día?</h2>
          <p>No necesitas hablar en términos técnicos. Elige el punto de partida que más se parezca a lo que quieres contar.</p>
        </div>
        <div className="type-grid">
          {ideaTypes.map(({ id, title, helper, icon: Icon }, index) => (
            <button key={id} className="type-card" onClick={() => openSubmit(id)}>
              <div className={`type-icon t${index}`}><Icon size={24}/></div>
              <h3>{title}</h3><p>{helper}</p><span>Contarlo <ArrowRight size={16}/></span>
            </button>
          ))}
        </div>
      </section>

      <section className="soft-section">
        <div className="container section">
          <div className="section-row">
            <div><span className="kicker">IMPACTO VISIBLE</span><h2>Ideas que ya están moviendo la aguja</h2></div>
            <button className="text-action" onClick={() => setPage('ideas')}>Ver todas las ideas <ArrowRight size={17}/></button>
          </div>
          <div className="impact-grid">
            <ImpactMetric icon={Lightbulb} value={ideas.length} label="Ideas compartidas" />
            <ImpactMetric icon={Zap} value={implemented.length} label="Implementadas" />
            <ImpactMetric icon={Clock3} value={`${hours}h`} label="Ahorro mensual estimado" />
            <ImpactMetric icon={Users} value={ideas.reduce((s, i) => s + (i.people || 0), 0)} label="Personas impactadas" />
          </div>
          <div className="idea-grid top-gap">
            {ideas.slice(0, 3).map(i => <IdeaCard key={i.id} idea={i} onSupport={() => toggleSupport(i.id)} onOpen={() => openDetail(i.id)} />)}
          </div>
        </div>
      </section>

      <section className="container values-band">
        <div className="values-copy">
          <span className="kicker">NUESTRA FORMA DE TRANSFORMAR</span>
          <h2>Ideas conectadas con lo que valoramos</h2>
          <p>Transformar también es escuchar, compartir experiencia, tomar responsabilidad y construir soluciones útiles para clientes y equipos.</p>
        </div>
        <div className="values-grid">
          <ValueTile n="01" title="Client focus" text="Empezamos por necesidades reales." />
          <ValueTile n="02" title="Expertise" text="Convertimos conocimiento en mejores procesos." />
          <ValueTile n="03" title="Courage & accountability" text="Probamos, aprendemos y medimos resultados." />
          <ValueTile n="04" title="Collaboration" text="Las mejores ideas se construyen en conjunto." />
        </div>
      </section>
    </>
  )
}

function ImpactMetric({ icon: Icon, value, label }) {
  return <div className="metric-card"><div className="metric-icon"><Icon size={20}/></div><div><strong>{value}</strong><span>{label}</span></div></div>
}

function ValueTile({ n, title, text }) {
  return <div className="value-tile"><span>{n}</span><h4>{title}</h4><p>{text}</p></div>
}

function IdeasPage({ ideas, toggleSupport, openSubmit, openDetail }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Todas')
  const [type, setType] = useState('Todos')
  const [sort, setSort] = useState('recent')

  const filtered = useMemo(() => {
    const result = ideas.filter(i => {
      const q = query.toLowerCase().trim()
      const matchQ = !q || [i.title, i.description, i.desired, i.area, i.author, ...(i.benefit || [])].some(v => (v || '').toLowerCase().includes(q))
      return matchQ && (status === 'Todas' || i.status === status) && (type === 'Todos' || i.type === type)
    })
    if (sort === 'support') return [...result].sort((a, b) => b.votes - a.votes)
    if (sort === 'score') return [...result].sort((a, b) => (b.impact / Math.max(1, b.effort)) - (a.impact / Math.max(1, a.effort)))
    return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [ideas, query, status, type, sort])

  return (
    <section className="container page-section">
      <div className="page-title-row">
        <div><span className="kicker">IDEAS DE TODOS</span><h1>Explora oportunidades</h1><p>Descubre qué están viendo otros equipos, abre el detalle, apoya ideas y evita duplicar propuestas.</p></div>
        <button className="primary" onClick={openSubmit}><Plus size={18}/> Compartir idea</button>
      </div>
      <div className="filterbar">
        <label className="searchbox"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por idea, área, beneficio o persona..."/></label>
        <Select value={status} onChange={setStatus} options={['Todas', ...statuses]} />
        <Select value={type} onChange={setType} options={['Todos', ...ideaTypes.map(x => x.id)]} />
        <Select value={sort} onChange={setSort} options={[{value:'recent',label:'Más recientes'},{value:'support',label:'Más apoyadas'},{value:'score',label:'Mayor impacto/esfuerzo'}]} />
      </div>
      <div className="result-row"><span>{filtered.length} resultados</span><span className="legend-dot"><i/> Haz clic en “Ver detalle” para revisar el caso completo</span></div>
      <div className="idea-grid">
        {filtered.map(i => <IdeaCard key={i.id} idea={i} onSupport={() => toggleSupport(i.id)} onOpen={() => openDetail(i.id)} />)}
      </div>
      {!filtered.length && <EmptyState title="No encontramos ideas con esos filtros" text="Prueba otra búsqueda o comparte una nueva oportunidad." />}
    </section>
  )
}

function IdeaCard({ idea, onSupport, onOpen }) {
  const liked = idea.supportedBy?.includes(currentUser.id)
  return (
    <article className="idea-card">
      <div className="idea-meta"><span className={`status-pill ${statusClass[idea.status]}`}>{idea.status}</span><span>{idea.area}</span></div>
      <h3>{idea.title}</h3>
      <p className="clamp">{idea.description}</p>
      <div className="tag-row">{idea.benefit.slice(0, 3).map(b => <span key={b}>{b}</span>)}</div>
      <button className="detail-link" onClick={onOpen}><Eye size={15}/> Ver detalle</button>
      <div className="idea-card-footer">
        <div><div className="avatar">{idea.author.charAt(0)}</div><span>{idea.author}</span></div>
        <button className={`vote-btn ${liked ? 'liked' : ''}`} onClick={onSupport} aria-pressed={liked} title={liked ? 'Quitar apoyo' : 'Apoyar idea'}>
          <ThumbsUp size={16} fill={liked ? 'currentColor' : 'none'}/><strong>{idea.votes}</strong><span>{liked ? 'Apoyada' : 'Apoyar'}</span>
        </button>
      </div>
    </article>
  )
}

function MyIdeasPage({ ideas, openSubmit, openDetail }) {
  const mine = ideas.filter(i => i.authorId === currentUser.id)
  return (
    <section className="container page-section">
      <div className="page-title-row">
        <div><span className="kicker">SEGUIMIENTO</span><h1>Mis ideas</h1><p>Lo importante no es solo enviar una idea: también puedes revisar el detalle y ver cómo va evolucionando.</p></div>
        <button className="primary" onClick={openSubmit}><Plus size={18}/> Nueva idea</button>
      </div>
      {mine.length ? <div className="tracking-list">{mine.map(i => <TrackingCard key={i.id} idea={i} onOpen={() => openDetail(i.id)}/>)}</div> : (
        <div className="empty-panel">
          <div className="empty-icon"><WandSparkles size={27}/></div>
          <h2>Tu primera idea puede empezar con algo muy simple</h2>
          <p>Una tarea repetitiva, un Excel que se podría simplificar, una validación que genera errores o una experiencia que podríamos mejorar.</p>
          <button className="primary" onClick={openSubmit}>Compartir mi primera idea</button>
        </div>
      )}
    </section>
  )
}

function TrackingCard({ idea, onOpen }) {
  const flow = ['Recibida', 'En evaluación', 'Priorizada', 'En desarrollo', 'Implementada']
  const index = idea.status === 'No priorizada' ? 1 : Math.max(0, flow.indexOf(idea.status))
  return (
    <article className="tracking-card">
      <div className="tracking-head">
        <div><span className="id-label">{idea.id}</span><h3>{idea.title}</h3><small>Enviada el {formatDate(idea.createdAt)} · {idea.area}</small></div>
        <span className={`status-pill ${statusClass[idea.status]}`}>{idea.status}</span>
      </div>
      <div className="progress-track">
        {['Recibida', 'Evaluación', 'Priorizada', 'Desarrollo', 'Implementada'].map((s, i) => <div key={s} className={`progress-step ${i <= index && idea.status !== 'No priorizada' ? 'done' : ''}`}><span>{i < index ? <Check size={13}/> : i + 1}</span><small>{s}</small></div>)}
      </div>
      <div className="tracking-bottom">
        <div className="tracking-note"><MessageSquareText size={17}/><p>{idea.reviewNote || statusNotes[idea.status]}</p></div>
        <button className="secondary" onClick={onOpen}><Eye size={16}/> Ver detalle</button>
      </div>
    </article>
  )
}

function AdminPage({ ideas, database, updateIdea, openDetail, restoreDemo, reloadDatabase, busyKey }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('score')

  const adminIdeas = useMemo(() => {
    let rows = ideas.filter(i => [i.title, i.area, i.author, i.type].join(' ').toLowerCase().includes(search.toLowerCase()))
    if (sort === 'score') rows = [...rows].sort((a, b) => (b.impact / Math.max(1, b.effort)) - (a.impact / Math.max(1, a.effort)))
    if (sort === 'votes') rows = [...rows].sort((a, b) => b.votes - a.votes)
    if (sort === 'recent') rows = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return rows
  }, [ideas, search, sort])

  const active = ideas.filter(i => !['No priorizada', 'Implementada'].includes(i.status)).length
  const inProgress = ideas.filter(i => ['Priorizada', 'En desarrollo'].includes(i.status)).length
  const quickWins = ideas.filter(i => i.impact >= 4 && i.effort <= 2 && i.status !== 'Implementada').length

  function exportCsv() {
    const columns = ['id','title','type','area','author','status','votes','impact','effort','hours','people','createdAt']
    const rows = [columns.join(','), ...ideas.map(i => columns.map(c => `"${String(i[c] ?? '').replaceAll('"','""')}"`).join(','))]
    downloadFile('coface-transforma-ideas.csv', rows.join('\n'), 'text/csv;charset=utf-8;')
  }

  return (
    <section className="container page-section">
      <div className="page-title-row admin-title">
        <div><span className="kicker">TRANSFORMATION TEAM</span><h1>Pipeline de oportunidades</h1><p>Revisa el caso completo, prioriza y mueve iniciativas con una trazabilidad mínima pero suficiente para una primera conversación de negocio.</p></div>
        <div className="admin-actions"><button className="secondary" onClick={exportCsv}><Download size={17}/> Descargar CSV</button></div>
      </div>

      <div className="admin-kpis">
        <AdminKpi icon={Inbox} label="Ideas registradas" value={ideas.length} />
        <AdminKpi icon={Gauge} label="Quick wins abiertos" value={quickWins} />
        <AdminKpi icon={Zap} label="Priorizadas / ejecución" value={inProgress} />
        <AdminKpi icon={Activity} label="Backlog activo" value={active} />
      </div>

      <div className="data-panel live-data-panel">
        <div className="data-panel-icon"><Server size={22}/></div>
        <div className="data-panel-copy">
          <div className="live-data-title"><strong>Base JSON activa</strong><span className="sync-pill"><i/> Sincronizada</span></div>
          <span><code>data/db.json</code> · {ideas.length} ideas · última escritura {formatSync(database.updatedAt)}</span>
          <small>Cada alta, apoyo y cambio de priorización se guarda en el archivo del servidor; localStorage ya no participa.</small>
        </div>
        <div className="data-panel-actions">
          <button className="ghost bordered" disabled={busyKey === 'reload'} onClick={reloadDatabase}><RefreshCw size={16}/> Recargar</button>
          <button className="ghost bordered danger-soft" disabled={busyKey === 'reset'} onClick={restoreDemo}><RefreshCw size={16}/> Restaurar demo</button>
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="searchbox"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en el pipeline..."/></label>
        <Select value={sort} onChange={setSort} options={[{value:'score',label:'Mayor impacto/esfuerzo'},{value:'votes',label:'Más apoyadas'},{value:'recent',label:'Más recientes'}]} />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Oportunidad</th><th>Área</th><th>Estado</th><th>Impacto</th><th>Esfuerzo</th><th>Score</th><th>Apoyos</th><th aria-label="Acciones"></th></tr></thead>
          <tbody>{adminIdeas.map(i => <AdminRow key={i.id} idea={i} updateIdea={updateIdea} openDetail={() => openDetail(i.id)}/>)}</tbody>
        </table>
      </div>
      <div className="scoring-help">
        <Settings2 size={19}/><div><strong>Criterio del MVP</strong><p>Score = Impacto ÷ Esfuerzo. Sirve como señal de priorización inicial; la decisión final puede considerar riesgo, dependencias, costo, regulación y alineación estratégica.</p></div>
      </div>
    </section>
  )
}

function AdminKpi({ icon: Icon, label, value }) {
  return <div className="admin-kpi"><Icon size={20}/><div><strong>{value}</strong><span>{label}</span></div></div>
}

function AdminRow({ idea, updateIdea, openDetail }) {
  return (
    <tr>
      <td><button className="table-idea-link" onClick={openDetail}><strong>{idea.title}</strong><small>{idea.id} · {idea.type}</small></button></td>
      <td>{idea.area}</td>
      <td><select className="table-select" value={idea.status} onChange={e => updateIdea(idea.id, { status: e.target.value })}>{statuses.map(s => <option key={s}>{s}</option>)}</select></td>
      <td><ScoreSelect value={idea.impact} onChange={v => updateIdea(idea.id, { impact: v })}/></td>
      <td><ScoreSelect value={idea.effort} onChange={v => updateIdea(idea.id, { effort: v })}/></td>
      <td><span className="score-badge">{(idea.impact / Math.max(1, idea.effort)).toFixed(1)}</span></td>
      <td><span className="votes-cell"><ThumbsUp size={15}/>{idea.votes}</span></td>
      <td><button className="icon-btn small-btn" onClick={openDetail} title="Ver detalle"><Eye size={16}/></button></td>
    </tr>
  )
}

function ScoreSelect({ value, onChange }) {
  return <select className="score-select" value={value} onChange={e => onChange(Number(e.target.value))}>{[1,2,3,4,5].map(n => <option value={n} key={n}>{n}/5</option>)}</select>
}

function IdeaDetailModal({ idea, liked, onClose, onSupport }) {
  const score = (idea.impact / Math.max(1, idea.effort)).toFixed(1)
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal detail-modal">
        <div className="modal-head detail-head">
          <div>
            <div className="detail-overline"><span className={`status-pill ${statusClass[idea.status]}`}>{idea.status}</span><span>{idea.id}</span></div>
            <h2>{idea.title}</h2>
            <div className="detail-author"><div className="avatar">{idea.author.charAt(0)}</div><span>{idea.author} · {idea.area}</span><span>·</span><span>{formatDate(idea.createdAt)}</span></div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={21}/></button>
        </div>

        <div className="detail-body">
          <div className="detail-main">
            <DetailSection title="¿Qué ocurre hoy?" text={idea.description} />
            <DetailSection title="¿Qué resultado se espera?" text={idea.desired || 'La persona que propuso la idea no definió una solución concreta. El equipo puede desarrollarla durante discovery.'} />

            <div className="detail-section">
              <h3>Beneficios esperados</h3>
              <div className="tag-row large-tags">{idea.benefit.map(b => <span key={b}>{b}</span>)}</div>
            </div>

            <div className="detail-section">
              <h3>Seguimiento</h3>
              <div className="review-box"><MessageSquareText size={18}/><div><strong>Nota de Transformación</strong><p>{idea.reviewNote || statusNotes[idea.status]}</p></div></div>
              <div className="timeline">
                {(idea.history || []).slice().reverse().map((item, index) => (
                  <div className="timeline-item" key={`${item.status}-${item.date}-${index}`}>
                    <span className="timeline-dot" />
                    <div><strong>{item.status}</strong><small>{formatDate(item.date)}</small><p>{item.note}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="detail-sidebar">
            <div className="sidebar-card support-card">
              <span className="sidebar-label">APOYO DE LA COMUNIDAD</span>
              <strong className="support-number">{idea.votes}</strong>
              <p>{liked ? 'Ya estás apoyando esta oportunidad.' : 'Apóyala si también ves valor en resolver este caso.'}</p>
              <button className={`support-button ${liked ? 'liked' : ''}`} onClick={onSupport}><ThumbsUp size={17} fill={liked ? 'currentColor' : 'none'}/>{liked ? 'Quitar apoyo' : 'Apoyar idea'}</button>
            </div>

            <div className="sidebar-card">
              <span className="sidebar-label">SEÑALES DE IMPACTO</span>
              <DetailStat icon={Clock3} label="Tiempo mensual" value={`${idea.hours || 0} h`} />
              <DetailStat icon={Users} label="Personas afectadas" value={idea.people || 0} />
              <DetailStat icon={Gauge} label="Impacto" value={`${idea.impact}/5`} />
              <DetailStat icon={Layers3} label="Esfuerzo" value={`${idea.effort}/5`} />
              <DetailStat icon={Sparkles} label="Score inicial" value={score} />
            </div>

            <div className="sidebar-card compact-info">
              <span className="sidebar-label">CONTEXTO</span>
              <p><UserRound size={15}/> {idea.participate ? 'La persona quiere participar en el desarrollo.' : 'No requiere participación del autor por ahora.'}</p>
              <p><CalendarDays size={15}/> Registrada el {formatDate(idea.createdAt)}.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function DetailSection({ title, text }) {
  return <div className="detail-section"><h3>{title}</h3><p className="detail-text">{text}</p></div>
}

function DetailStat({ icon: Icon, label, value }) {
  return <div className="detail-stat"><Icon size={16}/><span>{label}</span><strong>{value}</strong></div>
}

function SubmitIdea({ initialType, onClose, onSubmit, submitting = false }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ type: initialType, title: '', description: '', desired: '', area: 'Operaciones', benefit: [], hours: 1, people: 1, participate: true })
  const valid1 = form.type
  const valid2 = form.title.trim().length >= 5 && form.description.trim().length >= 12
  const valid3 = form.area && form.benefit.length > 0

  function toggleBenefit(b) {
    setForm(f => ({ ...f, benefit: f.benefit.includes(b) ? f.benefit.filter(x => x !== b) : [...f.benefit, b] }))
  }

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><div><span className="kicker">NUEVA OPORTUNIDAD</span><h2>Cuéntanos qué podríamos transformar</h2></div><button className="icon-btn" onClick={onClose}><X size={21}/></button></div>
        <div className="stepper"><Step n={1} current={step} label="Punto de partida"/><Step n={2} current={step} label="Cuéntanos"/><Step n={3} current={step} label="Impacto"/></div>
        <div className="modal-body">
          {step === 1 && <div><h3>¿Qué quieres compartir?</h3><p className="form-helper">Elige la opción que mejor describa tu caso. No necesitas tener una solución definida.</p><div className="type-grid modal-types">{ideaTypes.map(({id,title,helper,icon:Icon}) => <button key={id} className={`type-card mini ${form.type===id?'selected':''}`} onClick={() => setForm({...form,type:id})}><div className="type-icon"><Icon size={22}/></div><h4>{title}</h4><p>{helper}</p></button>)}</div></div>}
          {step === 2 && <div className="form-grid">
            <Field label="Ponle un nombre simple" hint="Ej.: Automatizar reporte mensual" full><input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="¿Cómo llamarías a esta oportunidad?"/></Field>
            <Field label="¿Qué pasa hoy?" hint="Describe la tarea, problema o fricción. No hace falta lenguaje técnico." full><textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Hoy tenemos que..." rows="4"/></Field>
            <Field label="¿Qué te gustaría que ocurriera?" hint="Opcional: describe cómo se vería una mejor experiencia." full><textarea value={form.desired} onChange={e => setForm({...form,desired:e.target.value})} placeholder="Idealmente podríamos..." rows="3"/></Field>
          </div>}
          {step === 3 && <div className="form-grid two">
            <Field label="Área principal"><Select value={form.area} onChange={v => setForm({...form,area:v})} options={areas}/></Field>
            <Field label="Tiempo aproximado al mes" hint="Horas dedicadas actualmente"><input type="number" min="0" value={form.hours} onChange={e => setForm({...form,hours:Number(e.target.value)})}/></Field>
            <Field label="Personas afectadas"><input type="number" min="1" value={form.people} onChange={e => setForm({...form,people:Number(e.target.value)})}/></Field>
            <Field label="¿Quieres participar en la transformación?"><div className="segmented"><button type="button" className={form.participate?'active':''} onClick={() => setForm({...form,participate:true})}>Sí</button><button type="button" className={!form.participate?'active':''} onClick={() => setForm({...form,participate:false})}>No</button></div></Field>
            <Field label="¿Qué beneficio tendría?" hint="Elige uno o varios" full><div className="benefit-grid">{benefits.map(b => <button type="button" key={b} className={form.benefit.includes(b)?'selected':''} onClick={() => toggleBenefit(b)}>{form.benefit.includes(b) && <Check size={14}/>} {b}</button>)}</div></Field>
            <div className="privacy-note"><Heart size={18}/><p>Comparte solo información necesaria para entender la oportunidad. Evita datos personales o información sensible de clientes.</p></div>
          </div>}
        </div>
        <div className="modal-footer"><button className="ghost" onClick={step===1?onClose:() => setStep(step-1)}>{step===1?'Cancelar':'Atrás'}</button>{step<3?<button className="primary" disabled={(step===1&&!valid1)||(step===2&&!valid2)} onClick={() => setStep(step+1)}>Continuar <ArrowRight size={17}/></button>:<button className="primary" disabled={!valid3 || submitting} onClick={() => onSubmit(form)}><Send size={17}/> {submitting ? 'Guardando…' : 'Enviar idea'}</button>}</div>
      </div>
    </div>
  )
}

function Step({ n, current, label }) {
  return <div className={`step ${current===n?'active':''} ${current>n?'done':''}`}><span>{current>n?<Check size={13}/>:n}</span><small>{label}</small></div>
}

function Field({ label, hint, full, children }) {
  return <label className={`field ${full?'full':''}`}><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>
}

function Select({ value, onChange, options }) {
  const normalized = options.map(o => typeof o === 'string' ? { value:o, label:o } : o)
  return <label className="select-wrap"><select value={value} onChange={e => onChange(e.target.value)}>{normalized.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select><ChevronDown size={16}/></label>
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><Search size={26}/><h3>{title}</h3><p>{text}</p></div>
}

function Toast({ message, tone }) {
  return <div className={`toast ${tone || 'success'}`}>{tone === 'error' ? <X size={17}/> : <Check size={17}/>}<span>{message}</span></div>
}

function Footer({ database }) {
  return <footer className="footer"><div className="container footer-inner"><div><img className="footer-logo" src={cofaceLogo} alt="Coface for trade" /><span className="footer-divider"/><strong>Transforma+</strong></div><p>MVP interno · JSON Server v{database.schemaVersion || 3} · {database.ideas.length} ideas</p></div></footer>
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default App
