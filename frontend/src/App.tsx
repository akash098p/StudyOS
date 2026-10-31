import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock3,
  GraduationCap,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  X,
  Volume2,
  VolumeX,
  Moon,
} from 'lucide-react'
import * as api from './api'
import type { Task, User, Subject } from './api'
import { ConfirmDialog } from './components/ConfirmDialog'
import { FlashcardWorkspace } from './components/FlashcardWorkspace'
import { useSound } from './hooks/useSound'

type ToastType = 'success' | 'warning' | 'error' | 'info'
type ToastNotice = { id: number; message: string; type: ToastType }

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getSubjectImage(key: string): string {
  if (/(physics|mechanic|electric|electronics)/.test(key)) return 'photo-1636466497217-26a8cbeaf0aa'
  if (/(chemistry|chemical|organic|inorganic)/.test(key)) return 'photo-1603126857599-f6e157fa2fe6'
  if (/(math|algebra|calculus|statistics)/.test(key)) return 'photo-1509228468518-180dd4864904'
  if (/(biology|botany|zoology|anatomy|life science)/.test(key))
    return 'photo-1530210124550-912dc1381cb8'
  if (
    /(computer|programming|coding|software|data structure|database|network|operating system|ai|machine learning)/.test(
      key
    )
  )
    return 'photo-1518770660439-4636190af475'
  if (/(english|literature|language|communication)/.test(key))
    return 'photo-1455390582262-044cdead277a'
  if (/(history|geography|political|economics|commerce|accounting|business)/.test(key))
    return 'photo-1454165804606-c3d57bc86b40'
  return 'photo-1456513080510-7bf3a84b82f8'
}

function App() {
  const [user, setUser] = useState<User | null>(null),
    [tasks, setTasks] = useState<Task[]>([]),
    [mode, setMode] = useState<'login' | 'register'>('login')
  const [auth, setAuth] = useState(!api.hasToken()),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false)
  const [error, setError] = useState(''),
    [notice, setNotice] = useState<ToastNotice | null>(null),
    [adding, setAdding] = useState(false),
    [title, setTitle] = useState(''),
    [subject, setSubject] = useState('Personal'),
    [estimatedMinutes, setEstimatedMinutes] = useState('30'),
    [scheduledAt, setScheduledAt] = useState(''),
    [notificationsEnabled, setNotificationsEnabled] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted'),
    [search, setSearch] = useState(''),
    [menu, setMenu] = useState(false),
    [activeTab, setActiveTab] = useState('Overview'),
    [timerSeconds, setTimerSeconds] = useState(1500),
    [timerRunning, setTimerRunning] = useState(false),
    [timerMode, setTimerMode] = useState<'Focus' | 'Break'>('Focus'),
    [customMinutes, setCustomMinutes] = useState('25'),
    [customSeconds, setCustomSeconds] = useState('00'),
    [newSubject, setNewSubject] = useState(''),
    [subjects, setSubjects] = useState<Subject[]>([])
  const sound = useSound()
  const soundRef = useRef(sound)
  soundRef.current = sound
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('studyos.theme') === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<Task | null>(null)
  const [confirmRemoveSubject, setConfirmRemoveSubject] = useState<Subject | null>(null)
  const [confirmSignout, setConfirmSignout] = useState(false)
  const [selectedWeekDay, setSelectedWeekDay] = useState(() => getLocalDateKey(new Date()))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  )
  const notifiedTasks = useRef<Set<string>>(new Set())
  const toastSequence = useRef(0)
  const toastTimer = useRef<number | null>(null)
  const refresh = useCallback(async () => setTasks(await api.listTasks()), [])
  useEffect(() => {
    try {
      localStorage.setItem('studyos.theme', theme)
    } catch {
      // Theme selection remains active for the current session when storage is unavailable.
    }
  }, [theme])
  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    []
  )
  const refreshSubjects = useCallback(async () => {
    let saved = await api.listSubjects()
    if (saved.length === 0) {
      try {
        const legacy = JSON.parse(localStorage.getItem('studyos.subjects') || '[]')
        if (Array.isArray(legacy)) {
          for (const value of legacy) {
            const name =
              typeof value === 'string' ? value : typeof value?.name === 'string' ? value.name : ''
            if (name.trim()) {
              try {
                await api.createSubject(name.trim())
              } catch {
                /* Existing entries are ignored. */
              }
            }
          }
          if (legacy.length) localStorage.removeItem('studyos.subjects')
          saved = await api.listSubjects()
        }
      } catch {
        /* Ignore malformed legacy data. */
      }
    }
    setSubjects(saved)
    return saved
  }, [])
  useEffect(() => {
    if (!api.hasToken()) {
      setLoading(false)
      return
    }
    api
      .me()
      .then(async u => {
        setUser(u)
        await Promise.all([refresh(), refreshSubjects()])
        setAuth(false)
      })
      .catch(() => {
        void api.logout()
        setAuth(true)
      })
      .finally(() => setLoading(false))
  }, [refresh])
  function dismissToast() {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = null
    setNotice(null)
  }
  function toast(message: string, type: ToastType = 'info', playSound = true) {
    const id = ++toastSequence.current
    setNotice({ id, message, type })
    if (playSound && type !== 'info') soundRef.current.play(type)
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => {
      setNotice(current => (current?.id === id ? null : current))
      toastTimer.current = null
    }, 4200)
  }
  async function enableNotifications() {
    if (!('Notification' in window)) {
      toast('This browser does not support desktop notifications.', 'warning')
      return
    }
    const permission = await Notification.requestPermission()
    setNotificationsEnabled(permission === 'granted')
    toast(
      permission === 'granted'
        ? 'Task reminders are enabled'
        : 'Allow notifications in your browser settings.',
      permission === 'granted' ? 'success' : 'warning'
    )
  }
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now()
      tasks.forEach(task => {
        const scheduledTime = task.scheduled_at ? Date.parse(task.scheduled_at) : NaN
        if (!Number.isFinite(scheduledTime) || task.is_completed) return

        const notify = (kind: 'start' | 'time-up') => {
          const reminderKey = `${task.id}:${kind}`
          if (notifiedTasks.current.has(reminderKey)) return
          notifiedTasks.current.add(reminderKey)
          if (kind === 'start') {
            soundRef.current.playTaskReminder()
            toast('Task starting now: ' + task.title, 'warning', false)
          } else {
            soundRef.current.playTaskTimeUp()
            toast('Estimated time is up for: ' + task.title, 'warning', false)
          }
          if (notificationsEnabled && Notification.permission === 'granted') {
            new Notification(
              kind === 'start' ? 'StudyOS · Task starting' : 'StudyOS · Time is up',
              {
                body: task.title + (task.subject ? ' · ' + task.subject : ''),
                tag: `studyos-task-${task.id}-${kind}`,
              }
            )
          }
        }

        if (scheduledTime <= now) notify('start')
        const estimatedEnd = scheduledTime + task.estimated_minutes * 60_000
        if (task.estimated_minutes > 0 && estimatedEnd <= now) notify('time-up')
      })
    }
    checkReminders()
    const id = window.setInterval(checkReminders, 1000)
    return () => window.clearInterval(id)
  }, [notificationsEnabled, tasks])
  useEffect(() => {
    if (!timerRunning) return
    const id = window.setInterval(
      () =>
        setTimerSeconds(s => {
          if (s <= 1) {
            setTimerRunning(false)
            if (timerMode === 'Focus') soundRef.current.playFocusComplete()
            toast(
              timerMode === 'Focus'
                ? 'Focus session complete! Take a break.'
                : 'Break complete! Ready to focus?',
              'success',
              timerMode !== 'Focus'
            )
            return 0
          }
          return s - 1
        }),
      1000
    )
    return () => window.clearInterval(id)
  }, [timerRunning, timerMode])
  function selectTab(tab: string) {
    setActiveTab(tab)
    setMenu(false)
  }
  function resetTimer(mode: 'Focus' | 'Break') {
    setTimerMode(mode)
    setTimerSeconds(
      mode === 'Focus'
        ? Math.max(1, Number(customMinutes) || 25) * 60 +
            Math.min(59, Math.max(0, Number(customSeconds) || 0))
        : 300
    )
    setTimerRunning(false)
  }
  function applyCustomTimer() {
    const mins = Math.min(599, Math.max(0, Number(customMinutes) || 0)),
      secs = Math.min(59, Math.max(0, Number(customSeconds) || 0))
    if (mins === 0 && secs === 0) {
      toast('Choose a timer duration greater than zero.', 'warning')
      return
    }
    setTimerMode('Focus')
    setTimerSeconds(mins * 60 + secs)
    setTimerRunning(false)
    toast('Custom focus duration set', 'success')
  }
  async function authSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const f = new FormData(e.currentTarget)
    try {
      const u =
        mode === 'register'
          ? await api.register(
              String(f.get('name') || ''),
              String(f.get('email')),
              String(f.get('password')),
              String(f.get('password_confirmation'))
            )
          : await api.login(String(f.get('email')), String(f.get('password')))
      setUser(u)
      setAuth(false)
      await Promise.all([refresh(), refreshSubjects()])
      toast('Welcome to your learning space', 'success')
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Unable to authenticate')
    } finally {
      setBusy(false)
    }
  }
  async function addSubject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = newSubject.trim()
    if (!name) return
    try {
      const created = await api.createSubject(name)
      setSubjects(p => [...p, created].sort((a, b) => a.name.localeCompare(b.name)))
      setNewSubject('')
      toast('Subject saved to your account', 'success')
    } catch (x) {
      toast(x instanceof Error ? x.message : 'Could not save subject', 'error')
    }
  }
  async function removeSubject(s: Subject) {
    setConfirmRemoveSubject(s)
  }

  async function confirmRemoveSubjectAction() {
    if (!confirmRemoveSubject) return
    try {
      await api.deleteSubject(confirmRemoveSubject.id)
      setSubjects(p => p.filter(v => v.id !== confirmRemoveSubject!.id))
      setConfirmRemoveSubject(null)
      toast('Subject removed', 'success')
    } catch (x) {
      setConfirmRemoveSubject(null)
      toast(x instanceof Error ? x.message : 'Could not remove subject', 'error')
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const t = await api.createTask(title.trim(), subject, Number(estimatedMinutes), scheduledAt || null)
      setTasks(p => [t, ...p])
      setTitle('')
      setEstimatedMinutes('30')
      setScheduledAt('')
      setAdding(false)
      toast('Task saved to your workspace', 'success')
    } catch (x) {
      toast(x instanceof Error ? x.message : 'Could not save task', 'error')
    }
  }
  async function toggle(t: Task) {
    try {
      const next = await api.updateTask(t.id, !t.is_completed)
      setTasks(p => p.map(v => (v.id === t.id ? next : v)))
    } catch (x) {
      toast(x instanceof Error ? x.message : 'Could not update task', 'error')
    }
  }
  async function remove(t: Task) {
    setConfirmDeleteTask(t)
  }

  async function confirmDeleteTaskAction() {
    if (!confirmDeleteTask) return
    try {
      await api.deleteTask(confirmDeleteTask.id)
      setTasks(p => p.filter(v => v.id !== confirmDeleteTask!.id))
      setConfirmDeleteTask(null)
      toast('Task deleted', 'success')
    } catch (x) {
      setConfirmDeleteTask(null)
      toast(x instanceof Error ? x.message : 'Could not delete task', 'error')
    }
  }
  async function signout() {
    await api.logout()
    setUser(null)
    setTasks([])
    setSubjects([])
    setAuth(true)
    setMode('login')
    setConfirmSignout(false)
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = getLocalDateKey(today)
  const visible = tasks.filter(
    t =>
      !(t.is_completed && t.scheduled_at && getLocalDateKey(new Date(t.scheduled_at)) < todayKey) &&
      (t.title + ' ' + (t.subject || '')).toLowerCase().includes(search.toLowerCase())
  )
  const done = tasks.filter(t => t.is_completed).length
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today)
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + i)
    return date
  })
  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  calendarStart.setDate(calendarStart.getDate() - ((calendarStart.getDay() + 6) % 7))
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(calendarStart)
    date.setDate(date.getDate() + i)
    return date
  })
  const selectedDayTasks = tasks
    .filter(task => task.scheduled_at && getLocalDateKey(new Date(task.scheduled_at)) === selectedWeekDay)
    .sort((a, b) => Date.parse(a.scheduled_at || '') - Date.parse(b.scheduled_at || ''))
  const selectedDate = new Date(`${selectedWeekDay}T00:00:00`)
  if (loading)
    return (
      <div className="loading">
        <div className="brand-mark">
          <GraduationCap />
        </div>
        <p>Preparing your study space…</p>
      </div>
    )
  return (
    <div className={`app-shell ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <aside className={'sidebar ' + (menu ? 'sidebar-open' : '')}>
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap size={23} />
          </div>
          <span>
            study<span className="brand-light">os</span>
          </span>
          <button className="icon-button mobile-close" onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav className="main-nav">
          <button
            className={'nav-item ' + (activeTab === 'Overview' ? 'active' : '')}
            onClick={() => selectTab('Overview')}
          >
            <LayoutDashboard />
            <span>Overview</span>
          </button>
          <button
            className={'nav-item ' + (activeTab === 'My timetable' ? 'active' : '')}
            onClick={() => selectTab('My timetable')}
          >
            <CalendarDays />
            <span>My timetable</span>
          </button>
          <button
            className={'nav-item ' + (activeTab === 'Subjects' ? 'active' : '')}
            onClick={() => selectTab('Subjects')}
          >
            <BookOpen />
            <span>Subjects</span>
          </button>
          <button
            className={'nav-item ' + (activeTab === 'Flashcards' ? 'active' : '')}
            onClick={() => selectTab('Flashcards')}
          >
            <Target />
            <span>Flashcards</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <Sparkles />
            <div>
              <strong>Make room to grow</strong>
              <p>Your learning journey, all in one place.</p>
            </div>
          </div>
          <button
            className={'nav-item ' + (activeTab === 'Account & privacy' ? 'active' : '')}
            onClick={() => selectTab('Account & privacy')}
          >
            <ShieldCheck />
            <span>Account & privacy</span>
          </button>
          <div className="profile-row">
            <div className="avatar">{user?.name.slice(0, 1).toUpperCase()}</div>
            <div className="profile-copy">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
            <button className="icon-button" title="Sign out" onClick={() => setConfirmSignout(true)}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button className="mobile-scrim" onClick={() => setMenu(false)} aria-label="Close menu" />
      )}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenu(!menu)}>
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{activeTab}</strong>
          </div>
          <div className="top-actions">
            <label className="search-box">
              <Search size={16} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
              />
            </label>
            <div className="top-avatar">{user?.name.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <div className="page-wrap">
          <section className={`welcome-row ${activeTab !== 'Overview' ? 'welcome-row-feature' : ''}`}>
            <div>
              <div className="eyebrow">
                <Sparkles size={14} /> YOUR PERSONAL STUDY SPACE
              </div>
              <h1>
                Make today <span>count.</span>
              </h1>
              <p className="welcome-subtitle">A little progress each day adds up to big results.</p>
            </div>
            <button className="primary-button" onClick={() => setAdding(true)}>
              <Plus size={17} /> Add a task
            </button>
          </section>
          {activeTab === 'Overview' && (
            <>
              <section className="hero-card">
                <div className="hero-content">
                  <div className="hero-pill">
                    <Sparkles size={13} /> YOUR DAILY FOCUS
                  </div>
                  <h2>
                    Small steps.
                    <br />
                    <span>Big momentum.</span>
                  </h2>
                  <p>
                    You’re building a habit, not just checking boxes. Keep showing up for yourself.
                  </p>
                  <button className="hero-button" onClick={() => selectTab('My timetable')}>
                    Plan my day <ArrowUpRight size={15} />
                  </button>
                </div>
                <div className="hero-art">
                  <div className="art-glow" />
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-sun" />
                  <div className="art-book book-back" />
                  <div className="art-book book-front">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="floating-note note-top">
                    <Sparkles size={14} /> Stay curious
                  </div>
                  <div className="floating-note note-bottom">✓ One step at a time</div>
                </div>
              </section>
              <section className="stats-grid">
                <article className="stat-card">
                  <div className="stat-icon lavender">
                    <CheckCircle2 />
                  </div>
                  <span>Tasks completed</span>
                  <strong>
                    {done}
                    <small> / {tasks.length}</small>
                  </strong>
                  <div className="mini-progress">
                    <i style={{ width: (tasks.length ? (done / tasks.length) * 100 : 0) + '%' }} />
                  </div>
                </article>
                <article className="stat-card">
                  <div className="stat-icon peach">
                    <Clock3 />
                  </div>
                  <span>Tasks remaining</span>
                  <strong>{tasks.length - done}</strong>
                  <p>Keep your pace steady</p>
                </article>
                <article className="stat-card">
                  <div className="stat-icon mint">
                    <Target />
                  </div>
                  <span>Task completion</span>
                  <strong>
                    {tasks.length ? Math.round((done / tasks.length) * 100) : 0}
                    <small>%</small>
                  </strong>
                  <div className="mini-progress blue-progress">
                    <i style={{ width: (tasks.length ? (done / tasks.length) * 100 : 0) + '%' }} />
                  </div>
                </article>
              </section>
              <section className="content-grid">
                <article className="panel tasks-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Your tasks</h3>
                      <p>A clear plan makes a calmer mind.</p>
                    </div>
                    <span className="count-pill">{visible.length} items</span>
                  </div>
                  <div className="task-list">
                    {visible.map(t => (
                      <div className={'task-row ' + (t.is_completed ? 'task-done' : '')} key={t.id}>
                        <button
                          className="task-check"
                          onClick={() => void toggle(t)}
                          aria-label="Toggle task"
                        >
                          {t.is_completed ? <CheckCircle2 /> : <Circle />}
                        </button>
                        <div className="task-main">
                          <strong>{t.title}</strong>
                          <div className="task-meta">
                            <span className="subject-chip">{t.subject || 'Personal'}</span>
                          <span><Clock3 size={12} /> {t.estimated_minutes || 30} min estimated</span>
                            <span>
                              <Clock3 size={12} />
                              {t.scheduled_at
                                ? new Date(t.scheduled_at).toLocaleString()
                                : 'No time set'}
                            </span>
                          </div>
                        </div>
                        <button
                          className="delete-button"
                          onClick={() => void remove(t)}
                          aria-label="Delete task"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {visible.length === 0 && (
                      <div className="empty-state">
                        <BookOpen size={25} />
                        <strong>{search ? 'No matching tasks' : 'A fresh page awaits'}</strong>
                        <p>
                          {search ? 'Try another search.' : 'Add one small goal to get started.'}
                        </p>
                        {!search && (
                          <button className="secondary-button" onClick={() => setAdding(true)}>
                            <Plus size={15} /> Create your first task
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <button className="add-task-row" onClick={() => setAdding(true)}>
                    <Plus size={16} /> Add another task
                  </button>
                </article>
                <article className="panel focus-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Focus session</h3>
                      <p>Protect a little time for yourself.</p>
                    </div>
                    <button type="button" className="live-pill notification-toggle" onClick={() => void enableNotifications()}>{notificationsEnabled ? 'BROWSER ALERTS ON' : 'ENABLE BROWSER ALERTS'}</button>
                  </div>
                  <div className="focus-visual">
                    <div className="focus-ring">
                      <div className="focus-ring-inner">
                        <span className="focus-time">
                          {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
                          {String(timerSeconds % 60).padStart(2, '0')}
                        </span>
                        <span className="focus-caption">{timerMode.toUpperCase()}</span>
                      </div>
                    </div>
                    <span className="focus-star star-one">✦</span>
                    <span className="focus-star star-two">✧</span>
                  </div>
                  <div className="custom-time-fields dashboard-custom-time">
                    <label>
                      Minutes
                      <input
                        type="number"
                        min="0"
                        max="599"
                        value={customMinutes}
                        onChange={e => setCustomMinutes(e.target.value)}
                        aria-label="Custom timer minutes"
                      />
                    </label>
                    <label>
                      Seconds
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={customSeconds}
                        onChange={e => setCustomSeconds(e.target.value)}
                        aria-label="Custom timer seconds"
                      />
                    </label>
                    <button className="secondary-button" onClick={applyCustomTimer}>
                      Set time
                    </button>
                    <button className="secondary-button" onClick={() => resetTimer('Break')}>
                      5 min break
                    </button>
                  </div>
                  <div className="focus-bottom">
                    <div>
                      <strong>{timerRunning ? 'Focus in progress' : 'Ready when you are'}</strong>
                      <span>
                        {timerRunning ? 'Stay with one task.' : 'Choose your own duration.'}
                      </span>
                    </div>
                    <button
                      className="play-button"
                      onClick={() =>
                        timerSeconds === 0 ? resetTimer(timerMode) : setTimerRunning(v => !v)
                      }
                      aria-label={timerRunning ? 'Pause timer' : 'Start timer'}
                    >
                      {timerRunning ? 'Ⅱ' : timerSeconds === 0 ? '↻' : '▶'}
                    </button>
                  </div>
                </article>
              </section>
              <section className="content-grid lower-grid">
                <article className="panel week-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Your week at a glance</h3>
                      <p>Consistency over perfection.</p>
                    </div>
                    <button
                      type="button"
                      className={'icon-button week-calendar-toggle ' + (calendarOpen ? 'active' : '')}
                      onClick={() => {
                        if (!calendarOpen) {
                          const selected = new Date(`${selectedWeekDay}T00:00:00`)
                          setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
                        }
                        setCalendarOpen(open => !open)
                      }}
                      aria-label={calendarOpen ? 'Show week view' : 'Open full calendar'}
                      aria-expanded={calendarOpen}
                      aria-controls="week-calendar"
                    >
                      <CalendarDays />
                    </button>
                  </div>
                  {calendarOpen ? (
                    <div className="full-calendar" id="week-calendar">
                      <div className="calendar-month-heading">
                        <strong>
                          {calendarMonth.toLocaleDateString('en', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                        <div>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Previous month"
                            onClick={() =>
                              setCalendarMonth(
                                month => new Date(month.getFullYear(), month.getMonth() - 1, 1)
                              )
                            }
                          >
                            <ChevronLeft />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Next month"
                            onClick={() =>
                              setCalendarMonth(
                                month => new Date(month.getFullYear(), month.getMonth() + 1, 1)
                              )
                            }
                          >
                            <ChevronRight />
                          </button>
                        </div>
                      </div>
                      <div className="calendar-grid" role="group" aria-label="Select a date">
                        {weekDays.map(date => (
                          <span className="calendar-weekday" key={date.getDay()}>
                            {date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)}
                          </span>
                        ))}
                        {calendarDays.map(date => {
                          const key = getLocalDateKey(date)
                          const count = tasks.filter(
                            task =>
                              task.scheduled_at &&
                              getLocalDateKey(new Date(task.scheduled_at)) === key
                          ).length
                          const isToday = key === getLocalDateKey(today)
                          const isSelected = key === selectedWeekDay
                          const isCurrentMonth = date.getMonth() === calendarMonth.getMonth()
                          return (
                            <button
                              type="button"
                              key={key}
                              className={[
                                'calendar-date',
                                isToday ? 'calendar-date-today' : '',
                                isSelected ? 'calendar-date-selected' : '',
                                isCurrentMonth ? '' : 'calendar-date-outside',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => {
                                setSelectedWeekDay(key)
                                if (!isCurrentMonth) {
                                  setCalendarMonth(
                                    new Date(date.getFullYear(), date.getMonth(), 1)
                                  )
                                }
                              }}
                              aria-pressed={isSelected}
                              aria-label={`${date.toLocaleDateString('en', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}, ${count} ${count === 1 ? 'task' : 'tasks'}`}
                            >
                              <span>{date.getDate()}</span>
                              <i className={count ? 'has-tasks' : ''} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="week-strip">
                      {weekDays.map(date => {
                        const key = getLocalDateKey(date)
                        const count = tasks.filter(
                          task =>
                            task.scheduled_at &&
                            getLocalDateKey(new Date(task.scheduled_at)) === key
                        ).length
                        const isToday = key === getLocalDateKey(today)
                        return (
                          <button
                            key={key}
                            type="button"
                            className={
                              'day-cell ' +
                              (isToday ? 'day-active ' : '') +
                              (key === selectedWeekDay ? 'day-selected' : '')
                            }
                            onClick={() => setSelectedWeekDay(key)}
                            aria-pressed={key === selectedWeekDay}
                            aria-label={`${date.toLocaleDateString('en', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}, ${count} ${count === 1 ? 'task' : 'tasks'}`}
                          >
                            <span>
                              {date.toLocaleDateString('en', { weekday: 'short' }).toUpperCase()}
                            </span>
                            <strong>{date.getDate()}</strong>
                            <i style={{ opacity: count ? 1 : 0.25 }} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="week-history-heading">
                    <strong>
                      {selectedDate.toLocaleDateString('en', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </strong>
                    <span>{selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'task' : 'tasks'}</span>
                  </div>
                  <div className="week-history-list" role="list" aria-label="Tasks for selected day">
                    {selectedDayTasks.length ? (
                      selectedDayTasks.map(task => (
                        <div
                          className={'week-history-item ' + (task.is_completed ? 'task-done' : '')}
                          key={task.id}
                          role="listitem"
                        >
                          {task.is_completed ? <CheckCircle2 /> : <Circle />}
                          <div>
                            <strong>{task.title}</strong>
                            <span>
                              {task.subject || 'Personal'} · {task.estimated_minutes || 30} min
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="week-history-empty">
                        <div className="summary-icon">
                          <CalendarDays />
                        </div>
                        <div>
                          <strong>You’re finding your rhythm</strong>
                          <span>No tasks scheduled for this day.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
                <article className="panel subjects-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Keep learning</h3>
                      <p>Pick up where you left off.</p>
                    </div>
                    <BookOpen />
                  </div>
                  {subjects.length === 0 ? (
                    <div className="empty-state">
                      <BookOpen size={25} />
                      <strong>No subjects yet</strong>
                      <p>
                        Add your subjects in the Subjects tab. They will be saved to your account.
                      </p>
                      <button className="secondary-button" onClick={() => selectTab('Subjects')}>
                        Manage subjects
                      </button>
                    </div>
                  ) : (
                    subjects.map(item => {
                      const name = item.name
                      const related = tasks.filter(t => t.subject === name)
                      const completed = related.filter(t => t.is_completed).length
                      const percent = related.length
                        ? Math.round((completed / related.length) * 100)
                        : 0
                      const key = name.toLowerCase()
                      const image = getSubjectImage(key)
                      return (
                        <div className="learning-card" key={item.id}>
                          <div className="learning-thumb">
                            <img
                              src={
                                'https://images.unsplash.com/' +
                                image +
                                '?auto=format&fit=crop&w=300&q=80'
                              }
                              alt={name + ' study image'}
                              loading="lazy"
                              onError={e => {
                                e.currentTarget.src =
                                  'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=300&q=80'
                              }}
                            />
                          </div>
                          <div className="learning-copy">
                            <strong>{name}</strong>
                            <span>
                              {related.length} task{related.length === 1 ? '' : 's'} · {completed}{' '}
                              completed
                            </span>
                            <div className="learning-progress">
                              <i style={{ width: percent + '%' }} />
                            </div>
                            <small>
                              {related.length
                                ? percent + '% of your tasks completed'
                                : 'No tasks yet · progress starts when you add tasks'}
                            </small>
                          </div>
                        </div>
                      )
                    })
                  )}
                </article>
              </section>
            </>
          )}
          {activeTab !== 'Overview' && (
            <section className="feature-view" key={activeTab}>
              <div className="feature-heading">
                <span className="eyebrow">
                  <Sparkles size={14} /> YOUR STUDY WORKSPACE
                </span>
                <h2>{activeTab}</h2>
                <p>
                  {activeTab === 'My timetable'
                    ? 'Your upcoming tasks, organized in one place.'
                    : activeTab === 'Subjects'
                      ? 'Organize the topics you are learning.'
                      : activeTab === 'Flashcards'
                        ? 'Practice active recall, one card at a time.'
                        : 'Manage your account and privacy.'}
                </p>
              </div>
              {activeTab === 'My timetable' && (
                <div className="feature-grid">
                  <article className="panel feature-card">
                    <div className="panel-heading">
                      <div>
                        <h3>Upcoming tasks</h3>
                        <p>Live tasks from your StudyOS account.</p>
                      </div>
                      <CalendarDays />
                    </div>
                    {tasks
                      .filter(t => !t.is_completed)
                      .map(t => (
                        <div className="feature-list-row" key={t.id}>
                          <CalendarDays />
                          <div>
                            <strong>{t.title}</strong>
                            <span>
                              {t.subject || 'Personal'} ·{' '}
                              {t.scheduled_at
                                ? new Date(t.scheduled_at).toLocaleString()
                                : 'No due date'}
                            </span>
                          </div>
                          <button className="secondary-button" onClick={() => void toggle(t)}>
                            Complete
                          </button>
                        </div>
                      ))}
                    {tasks.filter(t => !t.is_completed).length === 0 && (
                      <div className="empty-state">
                        <CalendarDays />
                        <strong>Your schedule is clear</strong>
                        <p>Add a task to start planning.</p>
                      </div>
                    )}
                    <button className="primary-button" onClick={() => setAdding(true)}>
                      <Plus size={16} /> Add a task
                    </button>
                  </article>
                  <article className="panel feature-card">
                    <h3>Focus timer</h3>
                    <p>Choose a sprint or a short reset.</p>
                    <div className="timer-controls">
                      <button
                        className={timerMode === 'Focus' ? 'active' : ''}
                        onClick={() => resetTimer('Focus')}
                      >
                        25 min focus
                      </button>
                      <button
                        className={timerMode === 'Break' ? 'active' : ''}
                        onClick={() => resetTimer('Break')}
                      >
                        5 min break
                      </button>
                    </div>
                    <div className="feature-timer">
                      {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:
                      {String(timerSeconds % 60).padStart(2, '0')}
                    </div>
                    <button
                      className="primary-button"
                      onClick={() =>
                        timerSeconds === 0 ? resetTimer(timerMode) : setTimerRunning(v => !v)
                      }
                    >
                      {timerRunning
                        ? 'Pause timer'
                        : timerSeconds === 0
                          ? 'Reset timer'
                          : 'Start timer'}
                    </button>
                  </article>
                </div>
              )}
              {activeTab === 'Subjects' && (
                <div className="feature-grid">
                  <article className="panel feature-card">
                    <div className="panel-heading">
                      <div>
                        <h3>Your subjects</h3>
                        <p>Add or remove your study areas.</p>
                      </div>
                      <BookOpen />
                    </div>
                    <form className="inline-add" onSubmit={addSubject}>
                      <input
                        value={newSubject}
                        onChange={e => setNewSubject(e.target.value)}
                        placeholder="Add a subject…"
                        maxLength={100}
                      />
                      <button className="primary-button">
                        <Plus size={16} /> Add
                      </button>
                    </form>
                    {subjects.map(s => (
                      <div className="feature-list-row" key={s.id}>
                        <div className="subject-symbol">
                          <BookOpen />
                        </div>
                        <div>
                          <strong>{s.name}</strong>
                          <span>{tasks.filter(t => t.subject === s.name).length} linked tasks</span>
                        </div>
                        <button
                          className="icon-button"
                          onClick={() => void removeSubject(s)}
                          aria-label={'Remove ' + s.name}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </article>
                  <article className="panel feature-card tip-card">
                    <Sparkles size={28} />
                    <h3>Study tip</h3>
                    <p>
                      Try a 25-minute focus sprint, then write down three things you learned without
                      looking at your notes.
                    </p>
                  </article>
                </div>
              )}
              {activeTab === 'Flashcards' && (
                <FlashcardWorkspace
                  subjects={subjects}
                  userId={user?.id ?? 0}
                  onManageSubjects={() => selectTab('Subjects')}
                  onFeedback={toast}
                />
              )}
              {activeTab === 'Account & privacy' && (
                <div className="panel feature-card settings-card">
                  <div className="panel-heading">
                    <div>
                      <h3>Account</h3>
                      <p>Your signed-in StudyOS profile.</p>
                    </div>
                    <ShieldCheck />
                  </div>
                  <div className="feature-list-row">
                    <div className="avatar">{user?.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <strong>{user?.name}</strong>
                      <span>{user?.email}</span>
                    </div>
                  </div>
                  <div className="feature-list-row">
                    <ShieldCheck />
                    <div>
                      <strong>Private workspace</strong>
                      <span>Task access is scoped to your signed-in account.</span>
                    </div>
                  </div>
                  <div className="settings-preferences">
                    <div className="settings-preference">
                      <div>
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        <span>
                          <strong>Appearance</strong>
                          <small>{theme === 'light' ? 'Light theme' : 'Dark theme'}</small>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setTheme(value => (value === 'light' ? 'dark' : 'light'))}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                      >
                        Switch
                      </button>
                    </div>
                    <div className="settings-preference">
                      <div>
                        {sound.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        <span>
                          <strong>Sounds</strong>
                          <small>{sound.enabled ? 'Success, warning, and error sounds on' : 'Sounds off'}</small>
                        </span>
                      </div>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => sound.toggle()}
                        aria-pressed={sound.enabled}
                      >
                        {sound.enabled ? 'Turn off' : 'Turn on'}
                      </button>
                    </div>
                  </div>
                  <button className="secondary-button" onClick={() => setConfirmSignout(true)}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </section>
          )}
          <footer className="footer">
            <span>© 2026 StudyOS</span>
          </footer>
        </div>
      </main>
      {auth && (
        <div className="modal-backdrop auth-backdrop">
          <form className="auth-card" onSubmit={authSubmit}>
            <div className="auth-logo">
              <div className="brand-mark">
                <GraduationCap />
              </div>
              <span>
                study<span className="brand-light">os</span>
              </span>
            </div>
            <div className="auth-heading">
              <span className="modal-kicker">YOUR NEXT CHAPTER STARTS HERE</span>
              <h2>{mode === 'login' ? 'Welcome back.' : 'Create your space.'}</h2>
              <p>
                {mode === 'login'
                  ? 'Sign in to pick up where you left off.'
                  : 'A calmer, more focused study day begins here.'}
              </p>
            </div>
            {mode === 'register' && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="How should we call you?"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                placeholder="At least 8 characters"
              />
            </label>
            {mode === 'register' && (
              <label>
                Confirm password
                <input
                  name="password_confirmation"
                  type="password"
                  minLength={8}
                  required
                  placeholder="Enter password again"
                />
              </label>
            )}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="primary-button auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in to StudyOS' : 'Create account'}{' '}
              <ArrowUpRight size={16} />
            </button>
            <p className="auth-switch">
              {mode === 'login' ? 'New to StudyOS?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setError('')
                }}
              >
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </button>
            </p>
            <p className="auth-footnote">
              <ShieldCheck size={14} /> Your study space is private to your account.
            </p>
          </form>
        </div>
      )}
      {adding && (
        <div className="modal-backdrop" onClick={() => setAdding(false)}>
          <form className="task-modal" onSubmit={add} onClick={e => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">MAKE A LITTLE PROGRESS</span>
                <h3>Add a task</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAdding(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </div>
            <label htmlFor="task-title">What would you like to work on?</label>
            <input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Review chapter 3…"
              autoFocus
              required
              maxLength={180}
            />
            <label htmlFor="task-subject">Subject</label>
            <select id="task-subject" value={subject} onChange={e => setSubject(e.target.value)}>
              <option value="Personal">Personal</option>
              {subjects.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <label htmlFor="task-estimate">Estimated time (minutes)</label>
            <input id="task-estimate" type="number" min="1" max="1440" value={estimatedMinutes} onChange={e => setEstimatedMinutes(e.target.value)} required />
            <label htmlFor="task-schedule">Remind me at</label>
            <input id="task-schedule" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            <p className="form-hint">Keep StudyOS open to hear reminders. Enable browser notifications for alerts when the app is in the background.</p>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button className="primary-button">
                <Plus size={16} /> Save task
              </button>
            </div>
          </form>
        </div>
      )}
      {notice && (
        <div className={`toast toast-${notice.type}`} role="status" aria-live="polite">
          {notice.type === 'success' ? (
            <CheckCircle2 size={17} />
          ) : notice.type === 'warning' ? (
            <AlertTriangle size={17} />
          ) : notice.type === 'error' ? (
            <AlertCircle size={17} />
          ) : (
            <Info size={17} />
          )}
          <span>{notice.message}</span>
          <button type="button" onClick={dismissToast} aria-label="Dismiss notification">
            <X size={15} />
          </button>
        </div>
      )}
      {confirmDeleteTask && (
        <ConfirmDialog
          isOpen={true}
          title="Delete task"
          message="Are you sure you want to delete this task?"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="delete"
          onConfirm={confirmDeleteTaskAction}
          onCancel={() => setConfirmDeleteTask(null)}
        />
      )}
      {confirmRemoveSubject && (
        <ConfirmDialog
          isOpen={true}
          title="Remove subject"
          message="Remove this subject? Existing tasks are retained."
          confirmLabel="Remove"
          cancelLabel="Cancel"
          variant="warning"
          onConfirm={confirmRemoveSubjectAction}
          onCancel={() => setConfirmRemoveSubject(null)}
        />
      )}
      {confirmSignout && (
        <ConfirmDialog
          isOpen={true}
          title="Sign out?"
          message="Are you sure you want to sign out of StudyOS?"
          confirmLabel="Sign out"
          cancelLabel="Stay signed in"
          variant="warning"
          onConfirm={signout}
          onCancel={() => setConfirmSignout(false)}
        />
      )}
    </div>
  )
}
export default App
