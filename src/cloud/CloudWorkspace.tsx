import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import App from '../App'

type WorkspaceData = { tasks: any[]; resources: any[]; goals: any[]; skills: any[]; problems: any[] }
type WorkspaceRow = { user_id: string; data: WorkspaceData; timezone: string; updated_at: string }
const STORAGE_KEYS = {
  tasks: 'ascend.tasks',
  resources: 'ascend.resources',
  goals: 'ascend.goals',
  skills: 'ascend.skills',
  problems: 'ascend.problems',
} as const
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
const supabase = SUPABASE_URL && ANON_KEY ? createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null
const EMPTY: WorkspaceData = { tasks: [], resources: [], goals: [], skills: [], problems: [] }
const OWNER_KEY = 'ascend.cloud.owner'

function normalizeWorkspace(input: any): WorkspaceData {
  const value = input && typeof input === 'object' ? input : {}
  const knownSampleIds = new Set(['t1', 't2', 't3', 't4', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'g1', 'g2', 'g3'])
  const out: WorkspaceData = {
    tasks: Array.isArray(value.tasks) ? value.tasks.filter((x: any) => !(x?.id && knownSampleIds.has(x.id))) : [],
    resources: Array.isArray(value.resources) ? value.resources.filter((x: any) => !(x?.id && knownSampleIds.has(x.id))) : [],
    goals: Array.isArray(value.goals) ? value.goals.filter((x: any) => !(x?.id && knownSampleIds.has(x.id))) : [],
    skills: Array.isArray(value.skills) ? value.skills : [],
    problems: Array.isArray(value.problems) ? value.problems : [],
  }
  return out
}
function readLocal(): WorkspaceData {
  const out: any = {}
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    try { const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]'); out[key] = Array.isArray(parsed) ? parsed : [] } catch { out[key] = [] }
  }
  return normalizeWorkspace(out)
}
function writeLocal(input: WorkspaceData) {
  const data = normalizeWorkspace(input)
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) localStorage.setItem(storageKey, JSON.stringify((data as any)[key] || []))
}
function clearLocal() { for (const storageKey of Object.values(STORAGE_KEYS)) localStorage.removeItem(storageKey) }
function hasAnyRecords(data: WorkspaceData) { return Object.values(data).some((rows) => rows.length > 0) }
function mergeRows(remoteRows: any[], localRows: any[], keyOf: (row: any) => string) {
  const map = new Map<string, any>()
  for (const row of remoteRows) map.set(keyOf(row), row)
  // Local values win during the one-time migration so the current browser's edits are preserved.
  for (const row of localRows) map.set(keyOf(row), row)
  return [...map.values()]
}
function mergeWorkspace(remoteInput: WorkspaceData, localInput: WorkspaceData): WorkspaceData {
  const remote = normalizeWorkspace(remoteInput), local = normalizeWorkspace(localInput)
  return {
    tasks: mergeRows(remote.tasks, local.tasks, (x) => String(x.id || x.title)),
    resources: mergeRows(remote.resources, local.resources, (x) => String(x.id || x.url || x.title)),
    goals: mergeRows(remote.goals, local.goals, (x) => String(x.id || x.title)),
    skills: mergeRows(remote.skills, local.skills, (x) => String(x.name || '').toLowerCase()),
    problems: mergeRows(remote.problems, local.problems, (x) => String(x.id || x.title)),
  }
}
function downloadBackup(data = readLocal()) {
  const payload = { schemaVersion: 1, exportedAt: new Date().toISOString(), data: normalizeWorkspace(data) }
  const url = window.URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `ascend-os-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}
function localTimeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata' } catch { return 'Asia/Kolkata' } }

export default function CloudWorkspace() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [workspaceError, setWorkspaceError] = useState('')
  const [retryIndex, setRetryIndex] = useState(0)
  const [syncStatus, setSyncStatus] = useState('Preparing workspace...')
  const [lastSaved, setLastSaved] = useState('')
  const [remoteConflict, setRemoteConflict] = useState<WorkspaceData | null>(null)
  const [conflictBusy, setConflictBusy] = useState(false)
  const lastLocalJson = useRef('')
  const lastRemoteAt = useRef('')
  const syncBusy = useRef(false)

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return
      if (error) setMessage(error.message)
      setSession(data.session)
      setAuthLoading(false)
    }).catch((error) => { if (alive) { setMessage(error instanceof Error ? error.message : 'Could not restore your session'); setAuthLoading(false) } })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => { alive = false; subscription.unsubscribe() }
  }, [])

  const userId = session?.user.id || ''
  useEffect(() => {
    if (!supabase || !userId) { setWorkspaceReady(false); return }
    let active = true
    async function bootstrap() {
      setWorkspaceReady(false); setWorkspaceError(''); setSyncStatus('Loading cloud data...')
      try {
        const migrationKey = `ascend.cloud.migrated.${userId}`
        const previousOwner = localStorage.getItem(OWNER_KEY)
        if (previousOwner && previousOwner !== userId) clearLocal()
        const local = readLocal()
        const migrated = localStorage.getItem(migrationKey) === '1'
        const { data: row, error } = await supabase!.from('user_workspaces').select('user_id,data,timezone,updated_at').eq('user_id', userId).maybeSingle()
        if (error) throw new Error(`Database read failed. Apply supabase/migrations/001_cloud_workspace.sql first. Details: ${error.message}`)
        let next: WorkspaceData
        if (row && migrated) next = normalizeWorkspace(row.data)
        else if (row) next = mergeWorkspace(row.data, local)
        else next = local
        if (!row || !migrated) {
          const { data: saved, error: saveError } = await supabase!.from('user_workspaces').upsert({ user_id: userId, data: next, timezone: localTimeZone(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('updated_at').single()
          if (saveError) throw new Error(`Database save failed: ${saveError.message}`)
          lastRemoteAt.current = saved.updated_at
        } else lastRemoteAt.current = row.updated_at
        writeLocal(next)
        localStorage.setItem(OWNER_KEY, userId)
        localStorage.setItem(migrationKey, '1')
        lastLocalJson.current = JSON.stringify(readLocal())
        if (!active) return
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        setMessage('')
        setSyncStatus('Cloud sync ready')
        setWorkspaceReady(true)
      } catch (error) {
        if (active) { setWorkspaceError(error instanceof Error ? error.message : 'Workspace initialization failed'); setSyncStatus('Needs setup') }
      }
    }
    void bootstrap()
    return () => { active = false }
  }, [userId, retryIndex])

  useEffect(() => {
    if (!supabase || !userId || !workspaceReady) return
    let active = true
    let lastPullCheck = 0
    syncBusy.current = false
    const sync = async () => {
      if (!active || syncBusy.current || remoteConflict) return
      syncBusy.current = true
      try {
        const current = readLocal()
        const encoded = JSON.stringify(current)
        if (encoded !== lastLocalJson.current) {
          // Avoid silently overwriting a newer cloud snapshot from another device.
          const { data: latest, error: latestError } = await supabase!.from('user_workspaces').select('data,updated_at').eq('user_id', userId).maybeSingle()
          if (latestError) throw latestError
          if (latest?.updated_at && lastRemoteAt.current && latest.updated_at !== lastRemoteAt.current) {
            setRemoteConflict(normalizeWorkspace(latest.data))
            setSyncStatus('Changes on another device need review')
            return
          }
          setSyncStatus('Saving changes...')
          const { data, error } = await supabase!.from('user_workspaces').upsert({ user_id: userId, data: current, timezone: localTimeZone(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('updated_at').single()
          if (error) throw error
          lastLocalJson.current = encoded
          lastRemoteAt.current = data.updated_at
          setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          setMessage('')
          setSyncStatus('All changes synced')
        } else if (Date.now() - lastPullCheck > 10000) {
          lastPullCheck = Date.now()
          const { data, error } = await supabase!.from('user_workspaces').select('data,updated_at').eq('user_id', userId).maybeSingle()
          if (error) throw error
          if (data?.updated_at && lastRemoteAt.current && data.updated_at !== lastRemoteAt.current) {
            const nowLocal = JSON.stringify(readLocal())
            if (nowLocal === lastLocalJson.current) {
              writeLocal(normalizeWorkspace(data.data))
              lastLocalJson.current = JSON.stringify(readLocal())
              lastRemoteAt.current = data.updated_at
              window.location.reload()
              return
            } else {
              setRemoteConflict(normalizeWorkspace(data.data))
              setSyncStatus('Changes on another device need review')
            }
          }
        }
      } catch (error) {
        setSyncStatus('Sync paused - changes remain on this device')
        setMessage(error instanceof Error ? error.message : 'Cloud sync failed. Check your connection.')
      } finally { syncBusy.current = false }
    }
    const timer = window.setInterval(() => { void sync() }, 5000)
    const onFocus = () => { void sync() }
    window.addEventListener('focus', onFocus)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [userId, workspaceReady, remoteConflict])

  async function submitAuth(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setAuthBusy(true); setMessage('')
    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
        if (error) throw error
        if (!data.session) setMessage('Account created. Check your email to confirm the account, then sign in.')
        else setMessage('Account created. Preparing your private workspace...')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        setMessage('Signed in. Loading your cloud workspace...')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication failed') }
    finally { setAuthBusy(false) }
  }
  async function signOut() { if (!supabase) return; await supabase.auth.signOut(); setRemoteConflict(null); setMessage('Signed out') }
  async function mergeCloudAndLocal() {
    if (!supabase || !userId || !remoteConflict) return
    setConflictBusy(true)
    try {
      const merged = mergeWorkspace(remoteConflict, readLocal())
      const { data, error } = await supabase.from('user_workspaces').upsert({ user_id: userId, data: merged, timezone: localTimeZone(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select('updated_at').single()
      if (error) throw error
      writeLocal(merged); lastLocalJson.current = JSON.stringify(readLocal()); lastRemoteAt.current = data.updated_at
      setRemoteConflict(null); setSyncStatus('Merged and synced'); setMessage('Cloud and local records merged. If a deleted record reappears, remove it again after confirming the merge.')
      window.location.reload()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not merge cloud data') }
    finally { setConflictBusy(false) }
  }
  function useCloudCopy() {
    if (!remoteConflict) return
    downloadBackup(readLocal())
    writeLocal(remoteConflict); setRemoteConflict(null); window.location.reload()
  }

  if (!supabase) return <div className="cloud-auth-screen"><div className="cloud-auth-card"><div className="cloud-brand-mark">A</div><p className="cloud-eyebrow">ASCEND OS  |  CLOUD SETUP</p><h1>Connect your workspace</h1><p className="cloud-copy">Add your Supabase project URL and publishable/anon key to <code>.env.local</code>. This app will then use hosted authentication and PostgreSQL instead of acting as a local-only workspace.</p><ol className="cloud-steps"><li>Create a Supabase project.</li><li>Run <code>supabase/migrations/001_cloud_workspace.sql</code> in its SQL Editor.</li><li>Copy <code>.env.example</code> to <code>.env.local</code> and fill in both values.</li><li>Restart Vite, or deploy the same values in your Vercel environment settings.</li></ol><button className="cloud-secondary" onClick={() => downloadBackup()}>Download my local data backup</button><p className="cloud-footnote">No service-role key belongs in the browser. Only the public publishable/anon key is used here, protected by database row-level security.</p></div></div>
  if (authLoading) return <div className="cloud-auth-screen"><div className="cloud-auth-card"><div className="cloud-spinner"/><h1>Restoring session...</h1></div></div>
  if (!session) return <div className="cloud-auth-screen"><div className="cloud-auth-card"><div className="cloud-brand-mark">A</div><p className="cloud-eyebrow">ASCEND OS  |  YOUR PERSONAL LEARNING OS</p><h1>{mode === 'sign-in' ? 'Welcome back.' : 'Create your workspace.'}</h1><p className="cloud-copy">Sign in to keep your goals, tasks, skills, resources and DSA history in your private cloud workspace.</p><form className="cloud-auth-form" onSubmit={submitAuth}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="cloud-primary" type="submit" disabled={authBusy}>{authBusy ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button></form>{message && <p className="cloud-message">{message}</p>}<button className="cloud-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }}>{mode === 'sign-in' ? 'New to Ascend OS? Create an account' : 'Already have an account? Sign in'}</button><button className="cloud-secondary" onClick={() => downloadBackup()}>Download local JSON backup</button></div></div>
  if (!workspaceReady) return <div className="cloud-auth-screen"><div className="cloud-auth-card"><div className="cloud-spinner"/><h1>Preparing your private workspace</h1><p className="cloud-copy">Migrating local records safely and connecting to PostgreSQL.</p>{workspaceError && <><p className="cloud-error">{workspaceError}</p><button className="cloud-primary" onClick={() => setRetryIndex(x => x + 1)}>Retry</button><button className="cloud-secondary" onClick={() => downloadBackup()}>Download local data backup</button><button className="cloud-switch" onClick={() => void signOut()}>Sign out</button></>}</div></div>

  return <div className="cloud-workspace-shell"><div className="cloud-statusbar"><span className="cloud-online-dot"/><strong>ASCEND CLOUD</strong><span className="cloud-status-text">{syncStatus}{lastSaved ? `  |  ${lastSaved}` : ''}</span>{message && <span className="cloud-inline-message" title={message}>{message}</span>}{remoteConflict && <><button onClick={() => downloadBackup()} className="cloud-status-action">Backup local</button><button onClick={() => void mergeCloudAndLocal()} className="cloud-status-action" disabled={conflictBusy}>{conflictBusy ? 'Merging...' : 'Merge copies'}</button><button onClick={useCloudCopy} className="cloud-status-action">Use cloud copy</button></>}<button className="cloud-status-action" onClick={() => downloadBackup()}>Backup</button><span className="cloud-user-email">{session.user.email}</span><button className="cloud-status-action" onClick={() => void signOut()}>Sign out</button></div><App /></div>
}