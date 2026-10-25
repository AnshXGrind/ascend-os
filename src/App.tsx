import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, BookOpen, BriefcaseBusiness,
  CalendarClock, Check, CheckCheck, ChevronDown, CircleHelp, Clock3, Code2, Command,
  Compass, ExternalLink, Flame, FolderKanban, GraduationCap, LayoutDashboard, ListTodo,
  Menu, MessageCircle, MoreHorizontal, Plus, Search, Settings2, Sparkles, Target,
  TrendingUp, Trophy, X, Zap, Timer, Play, Pause, Square, History,
} from 'lucide-react'

type Task = { id: string; title: string; area: string; due: string; time: string; priority: 'High'|'Medium'|'Low'; done: boolean; completedAt?: string }
type Resource = { id: string; title: string; provider: string; category: string; url: string; progress: number; status: 'In progress'|'Queued'|'Completed'; kind: string; playlistId?: string; playlistPosition?: number }
type Goal = { id: string; title: string; detail: string; progress: number; target: string; color: string }
type Skill = { name: string; value: number; evidence: string }
type Problem = { id:string; title:string; platform:string; topic:string; difficulty:'Easy'|'Medium'|'Hard'; url:string; status:'Todo'|'Attempted'|'Solved'; nextReview:string }
// ASCEND EXECUTION ENGINE V1
type FocusSession = { id:string; title:string; taskId?:string; startedAt:string; endedAt:string; durationSeconds:number; note:string }
type ActivityEntry = { id:string; kind:'focus'|'task'|'resource'|'problem'; title:string; detail:string; at:string }
type FocusTimerState = { title:string; taskId:string; note:string; startedAt:string|null; seconds:number; running:boolean }
type Page = 'Overview'|'Planner'|'Focus & activity'|'Learning library'|'DSA tracker'|'Goals & skills'|'Integrations'

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function localDateISO(d:Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function currentTimeHHMM() { const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
const initialTasks: Task[] = []
const initialResources: Resource[] = []
const initialGoals: Goal[] = []
const initialSkills: Skill[] = []
const initialProblems: Problem[] = []
function getSaved<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const value = JSON.parse(raw)
    if (!Array.isArray(value)) return fallback
    // Remove only IDs known to belong to the former sample dataset. Never delete by user-facing name.
    const legacySampleIds = new Set(['t1', 't2', 't3', 't4', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'g1', 'g2', 'g3'])
    const clean = value.filter((item: any) => !(item?.id && legacySampleIds.has(item.id)))
    if (clean.length !== value.length) localStorage.setItem(key, JSON.stringify(clean))
    return clean as T
  } catch {
    return fallback
  }
}
function IconBadge({ children, className='' }: { children:ReactNode; className?:string }) { return <span className={`icon-badge ${className}`}>{children}</span> }
function Progress({ value, tone='violet' }: { value:number; tone?:string }) { return <div className={`progress ${tone}`}><span style={{width:`${Math.max(0,Math.min(100,value))}%`}} /></div> }
function prettyDate(iso:string) { if (!iso) return 'No date'; const d=new Date(`${iso}T12:00:00`); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) }

function readFocusTimer():FocusTimerState {
  const fallback:FocusTimerState={title:'Deep work',taskId:'',note:'',startedAt:null,seconds:0,running:false}
  try {
    const parsed=JSON.parse(localStorage.getItem('ascend.focusTimer')||'{}')
    return {
      title:typeof parsed.title==='string'?parsed.title:'Deep work',
      taskId:typeof parsed.taskId==='string'?parsed.taskId:'',
      note:typeof parsed.note==='string'?parsed.note:'',
      startedAt:typeof parsed.startedAt==='string'?parsed.startedAt:null,
      seconds:typeof parsed.seconds==='number'&&Number.isFinite(parsed.seconds)&&parsed.seconds>=0?Math.floor(parsed.seconds):0,
      // Restore an interrupted timer as paused; never silently count time while the app was closed.
      running:false,
    }
  } catch { return fallback }
}
function formatDuration(totalSeconds:number) {
  const total=Math.max(0,Math.floor(totalSeconds))
  const hours=Math.floor(total/3600)
  const minutes=Math.floor((total%3600)/60)
  const seconds=total%60
  return hours>0?`${hours}h ${String(minutes).padStart(2,'0')}m`:minutes>0?`${minutes}m ${String(seconds).padStart(2,'0')}s`:`${seconds}s`
}

export default function App() {
  const [page,setPage]=useState<Page>('Overview')
  const [tasks,setTasks]=useState<Task[]>(()=>getSaved('ascend.tasks',initialTasks))
  const [resources,setResources]=useState<Resource[]>(()=>getSaved('ascend.resources',initialResources))
  const [goals,setGoals]=useState<Goal[]>(()=>getSaved('ascend.goals',initialGoals))
  const [skills,setSkills]=useState<Skill[]>(()=>getSaved('ascend.skills',initialSkills))
  const [problems,setProblems]=useState<Problem[]>(()=>getSaved('ascend.problems',initialProblems))
  const [focusSessions,setFocusSessions]=useState<FocusSession[]>(()=>getSaved<FocusSession[]>('ascend.focusSessions',[]))
  const [activity,setActivity]=useState<ActivityEntry[]>(()=>getSaved<ActivityEntry[]>('ascend.activity',[]))
  const [focusTimer,setFocusTimer]=useState<FocusTimerState>(()=>readFocusTimer())
  const [query,setQuery]=useState('')
  const [resourceCategory,setResourceCategory]=useState('All categories')
  const backupInputRef=useRef<HTMLInputElement>(null)
  const searchInputRef=useRef<HTMLInputElement>(null)
  const [showTask,setShowTask]=useState(false)
  const [showResource,setShowResource]=useState(false)
  const [showGoal,setShowGoal]=useState(false)
  const [showSkill,setShowSkill]=useState(false)
  const [showProblem,setShowProblem]=useState(false)
  const [ytKey,setYtKey]=useState(()=>localStorage.getItem('ascend.youtubeKey')||'')
  const [ytPlaylist,setYtPlaylist]=useState('')
  const [ytLoading,setYtLoading]=useState(false)
  const [ytError,setYtError]=useState('')
  const [mobileNav,setMobileNav]=useState(false)
  const [notice,setNotice]=useState('')
  const [cfHandle,setCfHandle]=useState(()=>localStorage.getItem('ascend.cfHandle')||'')
  const [cfStats,setCfStats]=useState<{rating:number;maxRating:number;rank:string;solved:number}|null>(null)
  const [cfLoading,setCfLoading]=useState(false)
  const [cfError,setCfError]=useState('')
  const [taskDraft,setTaskDraft]=useState({title:'',area:'DSA',due:todayISO(),time:'19:00',priority:'Medium' as Task['priority']})
  const [resourceDraft,setResourceDraft]=useState({title:'',provider:'YouTube',category:'DSA',url:'',kind:'Playlist'})
  const [goalDraft,setGoalDraft]=useState({title:'',detail:'',progress:0,target:'',color:'violet'})
  const [skillDraft,setSkillDraft]=useState({name:'',value:0,evidence:''})
  const [problemDraft,setProblemDraft]=useState({title:'',platform:'LeetCode',topic:'Arrays',difficulty:'Medium' as Problem['difficulty'],url:'',status:'Todo' as Problem['status'],nextReview:''})

  useEffect(()=>{localStorage.setItem('ascend.tasks',JSON.stringify(tasks))},[tasks])
  useEffect(()=>{localStorage.setItem('ascend.resources',JSON.stringify(resources))},[resources])
  useEffect(()=>{localStorage.setItem('ascend.goals',JSON.stringify(goals))},[goals])
  useEffect(()=>{localStorage.setItem('ascend.skills',JSON.stringify(skills))},[skills])
  useEffect(()=>{localStorage.setItem('ascend.problems',JSON.stringify(problems))},[problems])
  useEffect(()=>{localStorage.setItem('ascend.focusSessions',JSON.stringify(focusSessions))},[focusSessions])
  useEffect(()=>{localStorage.setItem('ascend.activity',JSON.stringify(activity))},[activity])
  useEffect(()=>{localStorage.setItem('ascend.focusTimer',JSON.stringify(focusTimer))},[focusTimer])
  useEffect(()=>{if(!focusTimer.running)return;const timer=window.setInterval(()=>setFocusTimer(old=>old.running?{...old,seconds:old.seconds+1}:old),1000);return()=>window.clearInterval(timer)},[focusTimer.running])
  useEffect(()=>{if(ytKey)localStorage.setItem('ascend.youtubeKey',ytKey);else localStorage.removeItem('ascend.youtubeKey')},[ytKey])
  useEffect(()=>{if(cfHandle)localStorage.setItem('ascend.cfHandle',cfHandle)},[cfHandle])
  useEffect(()=>{
    const onKeyDown=(event:KeyboardEvent)=>{
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[])
  useEffect(()=>{
    const check=()=>{
      const now=new Date(); const minute=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      const today=todayISO()
      tasks.filter(t=>!t.done&&t.due===today&&t.time===minute).forEach(t=>{
        const key=`ascend.notified.${t.id}.${today}.${minute}`
        if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1'); if('Notification'in window&&Notification.permission==='granted')new Notification(`Ascend reminder: ${t.title}`,{body:`${t.area} - scheduled for ${t.time}`}); setNotice(`Reminder due now: ${t.title}`)}
      })
    }
    check(); const timer=window.setInterval(check,15000); return ()=>window.clearInterval(timer)
  },[tasks])

  const completed=tasks.filter(t=>t.done).length
  const openTasks=tasks.filter(t=>!t.done)
  const todayTasks=tasks.filter(t=>t.due===todayISO()).sort((a,b)=>a.time.localeCompare(b.time))
  const pending=todayTasks.filter(t=>!t.done)
  const todayCompletionPct=todayTasks.length?Math.round(todayTasks.filter(t=>t.done).length/todayTasks.length*100):0
  const overdue=tasks.filter(t=>!t.done&&(t.due<todayISO()||(t.due===todayISO()&&t.time<currentTimeHHMM())))
  const filteredResources=useMemo(()=>resources.filter(r=>[r.title,r.provider,r.category,r.kind].join(' ').toLowerCase().includes(query.toLowerCase())&&(resourceCategory==='All categories'||r.category===resourceCategory)),[resources,query,resourceCategory])
  const completionPct=tasks.length?Math.round(completed/tasks.length*100):0
  const doneResources=resources.filter(r=>r.status==='Completed').length
  const inProgress=resources.filter(r=>r.status==='In progress').length
  const weekDays=useMemo(()=>{const current=new Date();const start=new Date(current);const monday=(current.getDay()+6)%7;start.setDate(current.getDate()-monday);return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return{label:d.toLocaleDateString('en-IN',{weekday:'short'}),date:d.getDate(),iso,done:tasks.filter(t=>t.done&&t.completedAt&&localDateISO(new Date(t.completedAt))===iso).length,active:iso===todayISO()}})},[tasks])
  const greet=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening'

  function logActivity(kind:ActivityEntry['kind'],title:string,detail='') {
    setActivity(old=>[{id:crypto.randomUUID(),kind,title,detail,at:new Date().toISOString()},...old].slice(0,300))
  }
  function toggleTask(id:string){
    const task=tasks.find(t=>t.id===id)
    if(task&&!task.done)logActivity('task',`Completed task: ${task.title}`,task.area)
    setTasks(old=>old.map(t=>t.id===id?{...t,done:!t.done,completedAt:!t.done?new Date().toISOString():undefined}:t))
  }
  function deleteTask(id:string){setTasks(old=>old.filter(t=>t.id!==id));setNotice('Task removed')}
  function addTask(e:FormEvent){e.preventDefault();if(!taskDraft.title.trim())return;setTasks(old=>[...old,{...taskDraft,id:crypto.randomUUID(),done:false}]);setTaskDraft({title:'',area:'DSA',due:todayISO(),time:'19:00',priority:'Medium'});setShowTask(false);setNotice('Task added to your planner')}
  function addResource(e:FormEvent){e.preventDefault();if(!resourceDraft.title.trim()||!resourceDraft.url.trim())return;setResources(old=>[{...resourceDraft,id:crypto.randomUUID(),progress:0,status:'Queued'},...old]);setResourceDraft({title:'',provider:'YouTube',category:'DSA',url:'',kind:'Playlist'});setShowResource(false);setNotice('Resource saved to your library')}
  function addGoal(e:FormEvent){e.preventDefault();if(!goalDraft.title.trim())return;setGoals(old=>[...old,{...goalDraft,id:crypto.randomUUID()}]);setGoalDraft({title:'',detail:'',progress:0,target:'',color:'violet'});setShowGoal(false);setNotice('Goal added')}
  function addSkill(e:FormEvent){e.preventDefault();if(!skillDraft.name.trim()||skills.some(s=>s.name.toLowerCase()===skillDraft.name.trim().toLowerCase()))return;setSkills(old=>[...old,{...skillDraft}]);setSkillDraft({name:'',value:0,evidence:''});setShowSkill(false);setNotice('Skill added')}
  function addProblem(e:FormEvent){e.preventDefault();if(!problemDraft.title.trim())return;setProblems(old=>[{...problemDraft,id:crypto.randomUUID()},...old]);setProblemDraft({title:'',platform:'LeetCode',topic:'Arrays',difficulty:'Medium',url:'',status:'Todo',nextReview:''});setShowProblem(false);setNotice('Problem added')}
  function updateProblem(id:string,status:Problem['status']){
    const problem=problems.find(p=>p.id===id)
    setProblems(old=>old.map(p=>p.id===id?{...p,status}:p))
    if(problem&&status==='Solved'&&problem.status!=='Solved')logActivity('problem',`Solved problem: ${problem.title}`,`${problem.platform} - ${problem.topic}`)
  }
  async function importYouTubePlaylist(e:FormEvent){
    e.preventDefault();setYtError('');const key=ytKey.trim();const input=ytPlaylist.trim();if(!key||!input){setYtError('Enter an API key and a playlist URL.');return}
    let playlistId=input;try{const u=new URL(input);playlistId=u.searchParams.get('list')||u.pathname.split('/').filter(Boolean).pop()||input}catch{}
    setYtLoading(true)
    try{
      const imported:Resource[]=[];let pageToken='';let pages=0
      do{
        const params=new URLSearchParams({part:'snippet,contentDetails',maxResults:'50',playlistId,key});if(pageToken)params.set('pageToken',pageToken)
        const response=await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,{signal:AbortSignal.timeout(15000)})
        const json=await response.json();if(!response.ok||json.error)throw new Error(json.error?.message||'Import failed. Check the API key and playlist access.')
        const items=Array.isArray(json.items)?json.items:[]
        items.forEach((v:any,index:number)=>{const videoId=v.contentDetails?.videoId;if(!v.snippet?.title||!videoId)return;imported.push({id:crypto.randomUUID(),title:v.snippet.title,provider:'YouTube',category:'Other',url:`https://www.youtube.com/watch?v=${videoId}`,progress:0,status:'Queued',kind:'Video',playlistId,playlistPosition:pages*50+index+1})})
        pageToken=json.nextPageToken||'';pages++
      }while(pageToken&&pages<10)
      const seen=new Set(resources.map(r=>r.url));const unique=imported.filter((r,index)=>!seen.has(r.url)&&imported.findIndex(x=>x.url===r.url)===index)
      if(!unique.length){setNotice('No new videos found. The playlist may be empty or already imported.');return}
      setResources(old=>[...unique.filter(n=>!old.some(r=>r.url===n.url)),...old])
      setNotice(`Imported ${unique.length} new videos${pageToken?' (stopped after 500 videos)':''}`);setYtPlaylist('')
    }catch(err){setYtError(err instanceof Error?err.message:'Could not import playlist')}finally{setYtLoading(false)}
  }

  async function enableNotifications(){if(!('Notification'in window)){setNotice('This browser does not support notifications');return}const p=await Notification.requestPermission();setNotice(p==='granted'?'Browser notifications enabled while Ascend is open':`Notification permission: ${p}`)}
  async function connectCodeforces(e:FormEvent){e.preventDefault();const handle=cfHandle.trim();if(!handle)return;setCfLoading(true);setCfError('');setCfStats(null);try{const response=await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);const json=await response.json();if(json.status!=='OK'||!json.result?.[0])throw new Error(json.comment||'Could not find this Codeforces handle');const u=json.result[0];let solved=0;try{const sub=await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`).then(r=>r.json());if(sub.status==='OK')solved=new Set(sub.result.filter((s:any)=>s.verdict==='OK').map((s:any)=>`${s.problem?.contestId}-${s.problem?.index}`)).size}catch{}setCfStats({rating:u.rating||0,maxRating:u.maxRating||0,rank:u.rank||'unrated',solved})}catch(err){setCfError(err instanceof Error?err.message:'Could not connect. Check the handle and try again.')}finally{setCfLoading(false)}}
  function finishFocusSession(){
    if(!focusTimer.startedAt||focusTimer.seconds<1){setNotice('Start a focus session before saving it');return}
    const linkedTask=tasks.find(t=>t.id===focusTimer.taskId)
    const endedAt=new Date().toISOString()
    const session:FocusSession={
      id:crypto.randomUUID(),title:linkedTask?.title||focusTimer.title.trim()||'Focused work',
      taskId:focusTimer.taskId||undefined,startedAt:focusTimer.startedAt,endedAt,
      durationSeconds:focusTimer.seconds,note:focusTimer.note.trim(),
    }
    setFocusSessions(old=>[session,...old].slice(0,300))
    setActivity(old=>[{id:crypto.randomUUID(),kind:'focus' as const,title:`Focus session: ${session.title}`,detail:`${formatDuration(session.durationSeconds)}${session.note?` - ${session.note}`:''}`,at:endedAt},...old].slice(0,300))
    setFocusTimer(old=>({...old,startedAt:null,seconds:0,running:false,note:''}))
    setNotice(`Logged ${formatDuration(session.durationSeconds)} of focused work`)
  }
  function updateGoal(id:string,value:number){setGoals(old=>old.map(g=>g.id===id?{...g,progress:Math.max(0,Math.min(100,value))}:g))}
  function updateSkill(name:string,value:number){setSkills(old=>old.map(s=>s.name===name?{...s,value:Math.max(0,Math.min(100,value))}:s))}
  function updateResourceStatus(id:string,status:Resource['status']){
    const resource=resources.find(r=>r.id===id)
    setResources(old=>old.map(r=>r.id===id?{...r,status,progress:status==='Completed'?100:status==='Queued'?0:r.progress}:r))
    if(resource&&status==='Completed'&&resource.status!=='Completed')logActivity('resource',`Completed resource: ${resource.title}`,resource.provider)
  }
  function exportData(){const payload={schemaVersion:2,exportedAt:new Date().toISOString(),tasks,resources,goals,skills,problems,focusSessions,activity};const a=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.href=url;a.download='ascend-os-backup.json';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Backup exported')}
  async function importBackup(e:ChangeEvent<HTMLInputElement>){
    const input=e.currentTarget
    const file=input.files?.[0]
    if(!file)return
    try{
      if(file.size>10*1024*1024)throw new Error('Backup files must be 10 MB or smaller.')
      const payload=JSON.parse(await file.text()) as Record<string,unknown>
      // CloudWorkspace exports { schemaVersion, exportedAt, data: {...} };
      // older App exports use the same arrays at the top level.
      const source=payload.data&&typeof payload.data==='object'&&!Array.isArray(payload.data)
        ? payload.data as Record<string,unknown>
        : payload
      const keys=['tasks','resources','goals','skills','problems']
      const optionalKeys=['focusSessions','activity']
      if(optionalKeys.some(k=>source[k]!==undefined&&(!Array.isArray(source[k])||(source[k] as unknown[]).some(item=>item===null||typeof item!=='object'||Array.isArray(item)))))throw new Error('Optional backup collections are invalid.')
      if(!keys.every(k=>Array.isArray(source[k])&&(source[k] as unknown[]).every(item=>item!==null&&typeof item==='object'&&!Array.isArray(item))))throw new Error('This file is not a valid Ascend OS backup.')
      const incoming=source as unknown as {tasks:Task[];resources:Resource[];goals:Goal[];skills:Skill[];problems:Problem[]}
      const incomingFocusSessions=(Array.isArray(source.focusSessions)?source.focusSessions:[]) as FocusSession[]
      const incomingActivity=(Array.isArray(source.activity)?source.activity:[]) as ActivityEntry[]
      if(!incoming.tasks.every(x=>typeof x.id==='string'&&typeof x.title==='string')
        ||!incoming.resources.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&typeof x.url==='string')
        ||!incoming.goals.every(x=>typeof x.id==='string'&&typeof x.title==='string')
        ||!incoming.skills.every(x=>typeof x.name==='string')
        ||!incoming.problems.every(x=>typeof x.id==='string'&&typeof x.title==='string')||!incomingFocusSessions.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&typeof x.durationSeconds==='number')||!incomingActivity.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&typeof x.at==='string'))throw new Error('Backup records failed validation. No data was changed.')
      const mode=window.prompt('Type MERGE to add backup data without duplicate IDs, or REPLACE to replace all current records.','MERGE')?.trim().toUpperCase()
      if(mode==='REPLACE'){
        if(!window.confirm('Replace all tasks, resources, goals, skills, DSA problems, focus sessions and activity with this backup? Export a backup first if unsure.'))return
        setTasks(incoming.tasks);setResources(incoming.resources);setGoals(incoming.goals);setSkills(incoming.skills);setProblems(incoming.problems);setFocusSessions(incomingFocusSessions);setActivity(incomingActivity)
      }else if(mode==='MERGE'){
        const merge=<T,>(old:T[],fresh:T[],key:(item:T)=>string)=>{const map=new Map(old.map(item=>[key(item),item]));fresh.forEach(item=>{const k=key(item);if(!map.has(k))map.set(k,item)});return Array.from(map.values())}
        setTasks(old=>merge(old,incoming.tasks,x=>x.id))
        setResources(old=>merge(old,incoming.resources,x=>x.id))
        setGoals(old=>merge(old,incoming.goals,x=>x.id))
        setSkills(old=>merge(old,incoming.skills,x=>x.name.trim().toLowerCase()))
        setProblems(old=>merge(old,incoming.problems,x=>x.id))
        setFocusSessions(old=>merge(old,incomingFocusSessions,x=>x.id))
        setActivity(old=>merge(old,incomingActivity,x=>x.id))
      }else{return}
      setNotice(mode==='REPLACE'?'Backup restored':'Backup merged with current data')
    }catch(err){setNotice(`Backup import failed: ${err instanceof Error?err.message:'Invalid file'}`)}finally{input.value=''}
  }

  const navItems:{label:Page;icon:ReactNode;section:string}[]=[
    {label:'Overview',icon:<LayoutDashboard size={17}/>,section:'WORKSPACE'},
    {label:'Planner',icon:<CalendarClock size={17}/>,section:'WORKSPACE'},
    {label:'Focus & activity',icon:<Timer size={17}/>,section:'WORKSPACE'},
    {label:'Learning library',icon:<BookOpen size={17}/>,section:'WORKSPACE'},
    {label:'DSA tracker',icon:<Code2 size={17}/>,section:'WORKSPACE'},
    {label:'Goals & skills',icon:<Target size={17}/>,section:'GROWTH'},
    {label:'Integrations',icon:<Activity size={17}/>,section:'SYSTEM'},
  ]
  const pageTitle=page==='Overview'?'Your command center':page==='Planner'?'Plan with intention':page==='Focus & activity'?'Protect your focus time':page==='Learning library'?'Your learning universe':page==='DSA tracker'?'Track every problem and revision':page==='Goals & skills'?'Build measurable skills':'Connect your ecosystem'

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'show-mobile':''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20}/></div><div><strong>ascend<span>.</span></strong><small>PERSONAL OS</small></div><button className="icon-button mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="profile-card"><div className="avatar">A</div><div className="profile-copy"><strong>My workspace</strong><span>Personal development</span></div><ChevronDown size={15} className="muted"/></div>
      <nav className="side-nav">{['WORKSPACE','GROWTH','SYSTEM'].map(section=><div className="nav-group" key={section}><span className="nav-label">{section}</span>{navItems.filter(n=>n.section===section).map(item=><button key={item.label} className={`nav-item ${page===item.label?'active':''}`} onClick={()=>{setPage(item.label);setMobileNav(false)}}>{item.icon}<span>{item.label}</span>{item.label==='Planner'&&openTasks.length>0&&<em>{openTasks.length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="streak-card"><div className="streak-icon"><Flame size={18}/></div><div><strong>Build your streak</strong><p>Small steps, every day.</p></div><ArrowUpRight size={15}/></div>
      <button className="nav-item settings-link" onClick={()=>setPage('Integrations')}><Settings2 size={17}/><span>Settings & data</span></button>
      <div className="sidebar-foot"><span className="status-dot"/> Your progress syncs to your cloud workspace</div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div></div><div className="top-actions"><label className="search-box"><Search size={16}/><input ref={searchInputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search resources..."/><kbd>Ctrl K</kbd></label><button className="icon-button notification-button" title="Enable notifications" onClick={enableNotifications}><Bell size={18}/><span/></button><div className="user-mini">A</div></div></header>
      <div className="page-wrap">
        {notice&&<div className="toast"><Check size={15}/>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div><h1>{page==='Overview'?`${greet}.`:pageTitle}</h1><p>{page==='Overview'?'Make today count. Consistency compounds into capability.':page==='Planner'?'Every goal becomes easier when the next action is clear.':page==='Focus & activity'?'Build deliberate focus sessions and keep a truthful history of completed work.':page==='Learning library'?'One place for everything you want to learn, build, and master.':page==='DSA tracker'?'Log your own problems, attempts and revision dates.':page==='Goals & skills'?'Track outcomes, not just hours spent watching content.':'Bring your learning activity into one connected workspace.'}</p></div><div className="heading-actions">{page==='Planner'?<button className="primary-button" onClick={()=>setShowTask(true)}><Plus size={17}/> Add task</button>:page==='Learning library'?<button className="primary-button" onClick={()=>setShowResource(true)}><Plus size={17}/> Add resource</button>:page==='DSA tracker'?<button className="primary-button" onClick={()=>setShowProblem(true)}><Plus size={17}/> Add problem</button>:page==='Goals & skills'?<button className="primary-button" onClick={()=>setShowGoal(true)}><Plus size={17}/> Add goal</button>:page==='Overview'?<button className="primary-button" onClick={()=>setShowTask(true)}><Plus size={17}/> Plan a task</button>:page==='Integrations'?<button className="secondary-button" onClick={exportData}><ExternalLink size={15}/> Export backup</button>:null}</div></div>

        {page==='Overview'&&<>
          <section className="stat-grid">
            <div className="stat-card"><div className="stat-top"><IconBadge className="purple"><Target size={17}/></IconBadge><span className="stat-trend"><ArrowUpRight size={13}/> All time</span></div><div className="stat-value">{completed}<span>/{tasks.length}</span></div><div className="stat-label">Tasks completed</div><Progress value={completionPct}/><div className="stat-foot">{completionPct}% of tracked tasks done</div></div>
            <div className="stat-card"><div className="stat-top"><IconBadge className="blue"><BookOpen size={17}/></IconBadge><span className="stat-chip">{inProgress} active</span></div><div className="stat-value">{resources.length.toString().padStart(2,'0')}</div><div className="stat-label">Learning resources</div><Progress value={resources.length?doneResources/resources.length*100:0} tone="blue"/><div className="stat-foot">{doneResources} completed  |  {resources.length-doneResources} to go</div></div>
            <div className="stat-card"><div className="stat-top"><IconBadge className="green"><TrendingUp size={17}/></IconBadge><span className="stat-chip">{skills.length?`Across ${skills.length} skills`:'No skills yet'}</span></div><div className="stat-value">{skills.length?Math.round(skills.reduce((n,s)=>n+s.value,0)/skills.length):'-'}{skills.length>0&&<span>/100</span>}</div><div className="stat-label">Skill development index</div><Progress value={skills.reduce((n,s)=>n+s.value,0)/Math.max(1,skills.length)} tone="green"/><div className="stat-foot">Self-assessed baseline - update with evidence</div></div>
            <div className="stat-card"><div className="stat-top"><IconBadge className="orange"><Clock3 size={17}/></IconBadge><span className={`priority-pill ${overdue.length?'danger':''}`}>{overdue.length?'Needs attention':'On track'}</span></div><div className="stat-value">{openTasks.length.toString().padStart(2,'0')}</div><div className="stat-label">Open tasks</div><div className="stat-detail"><span className="tiny-dot orange-dot"/>{overdue.length} overdue <span className="dot-divider"> | </span> {todayTasks.length} scheduled today</div><div className="stat-foot">Keep the next action visible</div></div>
          </section>

          <section className="content-grid overview-grid">
            <div className="panel focus-panel"><div className="panel-heading"><div><span className="section-kicker">DAILY EXECUTION</span><h2>Today's focus</h2></div><button className="text-link" onClick={()=>setPage('Planner')}>View planner <ArrowRight size={14}/></button></div><div className="focus-summary"><div className="focus-ring" style={{'--pct':`${todayCompletionPct}%`} as CSSProperties}><div><strong>{todayCompletionPct}%</strong><small>today complete</small></div></div><div className="focus-copy"><strong>{todayTasks.length?(pending.length?pending.length + " tasks left today":"You cleared today's list"):tasks.length?"No tasks planned today":"Your workspace is ready"}</strong><p>{todayTasks.length?(pending.length?"Choose one task and give it your full attention.":"You completed every task scheduled for today. Review tomorrow's plan or log a learning session."):tasks.length?"Your tasks are scheduled for other days. Add one today to create a focused plan.":"Add your first task, goal or learning resource to begin."}</p><span><Zap size={13}/> One focused block at a time</span></div></div><div className="task-list">{todayTasks.slice(0,4).map(task=><TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask}/>)}{todayTasks.length===0&&<EmptyState icon={<CheckCheck size={21}/>} title="Nothing scheduled yet" text="Add one clear next action to get started."/>}</div><button className="wide-ghost" onClick={()=>setShowTask(true)}><Plus size={15}/> Add a task to today</button></div>
            <div className="panel week-panel"><div className="panel-heading"><div><span className="section-kicker">YOUR RHYTHM</span><h2>This week</h2></div><span className="muted small">{weekDays.reduce((n,d)=>n+d.done,0)} completed</span></div><div className="week-chart">{weekDays.map(d=><button key={d.iso} className={`day-column ${d.active?'today':''}`} onClick={()=>{setPage('Planner');setQuery('')}} title={`${d.iso}: ${d.done} tasks completed`}><div className="bar-track"><div className="bar-fill" style={{height:`${d.done?Math.min(100,d.done*26):0}%`}}/></div><span className="day-date">{d.date}</span><span className="day-label">{d.label}</span></button>)}</div><div className="week-insight"><div className="insight-icon"><Sparkles size={16}/></div><div><strong>Progress beats perfect plans.</strong><p>Use this view to spot consistency, not to judge one busy day.</p></div></div><div className="weekly-target"><div><span>Weekly task completion</span><strong>{tasks.filter(t=>t.done&&weekDays.some(d=>d.iso===t.due)).length} <small>tasks</small></strong></div><Progress value={Math.min(100,weekDays.reduce((n,d)=>n+d.done,0)*14)} tone="blue"/></div></div>
          </section>

          <section className="content-grid lower-grid"><div className="panel goal-panel"><div className="panel-heading"><div><span className="section-kicker">LONG-TERM DIRECTION</span><h2>Goals in motion</h2></div><button className="text-link" onClick={()=>setPage('Goals & skills')}>All goals <ArrowRight size={14}/></button></div><div className="goal-list">{goals.slice(0,3).map(g=><div className="goal-row" key={g.id}><div className={`goal-symbol ${g.color}`}>{g.id==='g1'?<BriefcaseBusiness size={17}/>:g.id==='g2'?<Code2 size={17}/>:<GraduationCap size={17}/>}</div><div className="goal-main"><div className="goal-title-row"><strong>{g.title}</strong><span>{g.progress}%</span></div><p>{g.detail}</p><Progress value={g.progress} tone={g.color}/></div></div>)}</div></div>
            <div className="panel quick-panel"><div className="panel-heading"><div><span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Continue learning</h2></div><button className="icon-button" onClick={()=>setPage('Learning library')}><MoreHorizontal size={18}/></button></div><div className="continue-list">{resources.filter(r=>r.status==='In progress').slice(0,3).map(r=><div className="continue-item" key={r.id}><div className={`resource-icon ${r.category==='DSA'?'violet':r.category==='AI / ML'?'green':'blue'}`}>{r.category==='DSA'?<Code2 size={17}/>:r.category==='AI / ML'?<Sparkles size={17}/>:<BookOpen size={17}/>}</div><div className="continue-main"><strong>{r.title}</strong><span>{r.provider}  |  {r.progress}%</span><Progress value={r.progress}/></div><a href={r.url} target="_blank" rel="noreferrer" className="icon-button" aria-label={`Open ${r.title}`}><ArrowUpRight size={16}/></a></div>)}{resources.filter(r=>r.status==='In progress').length===0&&<EmptyState icon={<BookOpen size={19}/>} title="Nothing in progress" text="Add a resource and mark it in progress when you start."/>}</div></div></section>
          <div className="bottom-note"><div className="note-icon"><CircleHelp size={16}/></div><p><strong>Make this dashboard honest.</strong> Update progress when you finish lessons, solve problems, or ship projects. Imported activity should be treated as evidence-not as a substitute for learning.</p><button onClick={()=>setPage('Integrations')}>Set up data <ArrowRight size={14}/></button></div>
        </>}

        {page==='Planner'&&<section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">PLAN  |  EXECUTE  |  REVIEW</span><h2>Your task timeline</h2></div><div className="inline-actions"><button className="secondary-button" onClick={enableNotifications}><Bell size={15}/> Notifications</button><button className="primary-button" onClick={()=>setShowTask(true)}><Plus size={16}/> New task</button></div></div><div className="planner-overview"><div><span>Open tasks</span><strong>{tasks.filter(t=>!t.done).length}</strong></div><div><span>Due today</span><strong>{pending.length}</strong></div><div><span>Overdue</span><strong className={overdue.length?'red-text':''}>{overdue.length}</strong></div><div><span>Completion</span><strong>{completionPct}%</strong></div></div><div className="planner-section-title"><h3>Overdue</h3><span>{overdue.length} tasks</span></div>{overdue.length?overdue.sort((a,b)=>a.due.localeCompare(b.due)).map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} detailed/>):<p className="empty-line">No overdue tasks. Keep it that way with realistic scheduling.</p>}<div className="planner-section-title"><h3>Today  |  {prettyDate(todayISO())}</h3><span>{todayTasks.length} tasks</span></div>{todayTasks.length?todayTasks.map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} detailed/>):<EmptyState icon={<CalendarClock size={22}/>} title="Your day is open" text="Add a task with a due date and time to plan your next step."/>}<div className="planner-section-title"><h3>Upcoming</h3><span>Next deadlines</span></div>{tasks.filter(t=>!t.done&&t.due>todayISO()).sort((a,b)=>`${a.due}${a.time}`.localeCompare(`${b.due}${b.time}`)).map(t=><TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} detailed/>)}{tasks.every(t=>t.done||t.due<=todayISO())&&<p className="empty-line">No future tasks scheduled yet.</p>}</section>}

        {page==='Focus & activity'&&<div className="execution-layout">
          <section className="panel execution-focus-panel">
            <div className="panel-heading"><div><span className="section-kicker">FOCUS SESSION</span><h2>Protect one block of time</h2><p className="panel-subtitle">The timer saves only when you finish and log the session.</p></div><IconBadge className="purple"><Timer size={18}/></IconBadge></div>
            <div className="execution-focus-body">
              <div className="execution-clock"><span>{String(Math.floor(focusTimer.seconds/3600)).padStart(2,'0')}:{String(Math.floor((focusTimer.seconds%3600)/60)).padStart(2,'0')}:{String(focusTimer.seconds%60).padStart(2,'0')}</span><small>{focusTimer.running?'FOCUS IN PROGRESS':focusTimer.startedAt?'SESSION PAUSED':'READY TO FOCUS'}</small><div className="execution-clock-track"><span style={{width:`${Math.min(100,(focusTimer.seconds/1500)*100)}%`}}/></div><p>One task. One block. No invented study time.</p></div>
              <div className="execution-controls">
                <label>Focus title<input value={focusTimer.title} disabled={!!focusTimer.startedAt} onChange={e=>setFocusTimer(old=>({...old,title:e.target.value}))} placeholder="Deep work"/></label>
                <label>Link a task<select aria-label="Link a task" value={focusTimer.taskId} disabled={!!focusTimer.startedAt} onChange={e=>setFocusTimer(old=>({...old,taskId:e.target.value}))}><option value="">Independent focus session</option>{openTasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
                <label>Session note<input value={focusTimer.note} onChange={e=>setFocusTimer(old=>({...old,note:e.target.value}))} placeholder="What will you finish in this block?"/></label>
                <div className="execution-buttons"><button className="primary-button" onClick={()=>setFocusTimer(old=>({...old,startedAt:old.startedAt||new Date().toISOString(),running:true}))} disabled={focusTimer.running}><Play size={14}/>{focusTimer.startedAt?'Resume timer':'Start focus'}</button><button className="secondary-button" onClick={()=>setFocusTimer(old=>({...old,running:false}))} disabled={!focusTimer.running}><Pause size={14}/> Pause</button><button className="secondary-button" onClick={finishFocusSession} disabled={!focusTimer.startedAt||focusTimer.seconds<1}><Square size={13}/> Finish & log</button></div>
                <p className="execution-hint">If you refresh or close the page, an unfinished timer is restored as paused. Time away is not counted automatically.</p>
              </div>
            </div>
          </section>
          <section className="panel execution-stats-panel"><div className="panel-heading"><div><span className="section-kicker">MEASURED WORK</span><h2>Your focus stats</h2></div><Clock3 size={18} className="muted"/></div><div className="execution-stat-grid"><div><span>Focus minutes today</span><strong>{Math.round(focusSessions.filter(s=>localDateISO(new Date(s.endedAt))===todayISO()).reduce((n,s)=>n+s.durationSeconds,0)/60)}</strong></div><div><span>Sessions today</span><strong>{focusSessions.filter(s=>localDateISO(new Date(s.endedAt))===todayISO()).length}</strong></div><div><span>Total sessions</span><strong>{focusSessions.length}</strong></div><div><span>Total focus hours</span><strong>{(focusSessions.reduce((n,s)=>n+s.durationSeconds,0)/3600).toFixed(1)}</strong></div></div><div className="execution-callout"><Sparkles size={16}/><p><strong>Quality over the timer.</strong> Use session notes to record the outcome, not just the duration.</p></div></section>
          <section className="panel execution-history-panel"><div className="panel-heading"><div><span className="section-kicker">FOCUS HISTORY</span><h2>Recent sessions</h2></div><span className="muted small">{focusSessions.length} logged</span></div>{focusSessions.length===0?<EmptyState icon={<Clock3 size={21}/>} title="No focus sessions yet" text="Start a timer, finish a block and log the work you actually did."/>:<div className="execution-session-list">{focusSessions.slice(0,10).map(s=><div className="execution-session-row" key={s.id}><IconBadge className="green"><Check size={16}/></IconBadge><div className="execution-item-main"><strong>{s.title}</strong><span>{new Date(s.endedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}{s.note?` | ${s.note}`:''}</span></div><strong className="execution-duration">{formatDuration(s.durationSeconds)}</strong></div>)}</div>}</section>
          <section className="panel execution-activity-panel"><div className="panel-heading"><div><span className="section-kicker">REAL ACTIVITY</span><h2>Activity timeline</h2><p className="panel-subtitle">New completions from now on; no synthetic history is generated.</p></div><History size={18} className="muted"/></div>{activity.length===0?<EmptyState icon={<Activity size={21}/>} title="Your timeline starts here" text="Log a focus session, complete a task, finish a resource or solve a DSA problem."/>:<div className="execution-activity-list">{activity.slice(0,25).map(item=><div className="execution-activity-row" key={item.id}><span className={`execution-activity-mark ${item.kind}`}/><div className="execution-item-main"><strong>{item.title}</strong><span>{item.detail||item.kind}</span></div><time>{new Date(item.at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</time></div>)}</div>}</section>
        </div>}
        {page==='Learning library'&&<section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">CURATE YOUR INPUTS</span><h2>Resource library</h2><p className="panel-subtitle">Save a link, choose a category, then track it as queued, in progress, or complete.</p></div><button className="primary-button" onClick={()=>setShowResource(true)}><Plus size={16}/> Add resource</button></div><div className="library-toolbar"><div className="library-count"><strong>{resources.length}</strong> resources <span> | </span> {inProgress} in progress</div><select className="select-control" onChange={e=>setResourceCategory(e.target.value)} defaultValue="All categories"><option>All categories</option>{['DSA','AI / ML','Backend','System Design','Communication','Cloud','Frontend','Other'].map(c=><option key={c}>{c}</option>)}</select></div><div className="resource-grid">{filteredResources.map(r=><article className="resource-card" key={r.id}><div className="resource-card-top"><div className={`resource-icon large ${r.category==='DSA'?'violet':r.category==='AI / ML'?'green':r.category==='Cloud'?'orange':'blue'}`}>{r.category==='DSA'?<Code2 size={20}/>:r.category==='AI / ML'?<Sparkles size={20}/>:r.category==='Communication'?<MessageCircle size={20}/>:<BookOpen size={20}/>}</div><span className={`status-badge ${r.status.toLowerCase().replace(' ','-')}`}>{r.status}</span></div><span className="resource-category">{r.category}  |  {r.kind}</span><h3>{r.title}</h3><p>{r.provider}</p><div className="resource-progress-label"><span>Progress</span><strong>{r.progress}%</strong></div><Progress value={r.progress} tone={r.category==='AI / ML'?'green':'violet'}/><input className="resource-progress-slider" aria-label={`Progress for ${r.title}`} type="range" min="0" max="100" step="5" value={r.progress} onChange={e=>{const progress=Number(e.target.value);setResources(old=>old.map(x=>x.id===r.id?{...x,progress,status:progress===100?'Completed':progress>0?'In progress':'Queued'}:x))}}/><div className="resource-card-footer"><select aria-label={`Status for ${r.title}`} value={r.status} onChange={e=>updateResourceStatus(r.id,e.target.value as Resource['status'])}><option>Queued</option><option>In progress</option><option>Completed</option></select><a href={r.url} target="_blank" rel="noreferrer" className="open-resource">Open <ExternalLink size={13}/></a><button className="text-link" onClick={()=>setResources(old=>old.filter(x=>x.id!==r.id))}>Remove</button></div></article>)}{filteredResources.length===0&&<EmptyState icon={<Search size={22}/>} title="No matching resources" text="Try another search or add a new resource."/>}</div><div className="integration-callout"><div className="callout-symbol"><FolderKanban size={20}/></div><div><strong>Saved playlists aren't the same as completed learning.</strong><p>Keep a status and completion estimate. Later, sync playlist metadata from YouTube Data API and progress from supported providers.</p></div><button className="text-link" onClick={()=>setPage('Integrations')}>Integration plan <ArrowRight size={14}/></button></div></section>}

        {page==='DSA tracker'&&<section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">PROBLEM LOG  |  REVISION</span><h2>Your DSA workspace</h2><p className="panel-subtitle">Add problems yourself. No example problems are preloaded.</p></div><button className="primary-button" onClick={()=>setShowProblem(true)}><Plus size={16}/> Add problem</button></div><div className="planner-overview"><div><span>Total logged</span><strong>{problems.length}</strong></div><div><span>Solved</span><strong>{problems.filter(p=>p.status==='Solved').length}</strong></div><div><span>To do</span><strong>{problems.filter(p=>p.status==='Todo').length}</strong></div><div><span>Needs revision</span><strong>{problems.filter(p=>p.nextReview&&p.nextReview<=todayISO()&&p.status==='Solved').length}</strong></div></div>{problems.length===0?<EmptyState icon={<Code2 size={22}/>} title="Your problem tracker is empty" text="Add your first LeetCode, Codeforces, or Striver problem. Nothing is prefilled."/>:<div className="problem-list">{problems.map(p=><div className="problem-row" key={p.id}><div className="problem-main"><strong>{p.title}</strong><span>{p.platform}  |  {p.topic}  |  {p.difficulty}{p.nextReview?`  |  Review ${prettyDate(p.nextReview)}`:''}</span></div>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" className="open-resource">Open <ExternalLink size={13}/></a>}<select value={p.status} onChange={e=>updateProblem(p.id,e.target.value as Problem['status'])}><option>Todo</option><option>Attempted</option><option>Solved</option></select><button className="icon-button" aria-label="Delete problem" onClick={()=>setProblems(old=>old.filter(x=>x.id!==p.id))}><X size={15}/></button></div>)}</div>}</section>}

        {page==='Goals & skills'&&<div className="growth-layout"><section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">THE WHY</span><h2>Your goals</h2></div><button className="primary-button" onClick={()=>setShowGoal(true)}><Plus size={15}/> Add goal</button></div>{goals.length===0?<EmptyState icon={<Target size={22}/>} title="No goals yet" text="Create your own goal, target date and starting progress."/>:<div className="goal-cards">{goals.map(g=><div className="goal-card" key={g.id}><div className={`goal-symbol ${g.color}`}><Target size={18}/></div><span className="goal-target">Target  |  {g.target}</span><h3>{g.title}</h3><p>{g.detail}</p><div className="goal-progress-row"><strong>{g.progress}%</strong><span>complete</span></div><Progress value={g.progress} tone={g.color}/><button className="text-link" onClick={()=>setGoals(old=>old.filter(x=>x.id!==g.id))}>Remove goal <X size={12}/></button><div className="slider-row"><label htmlFor={`goal-${g.id}`}>Update progress</label><input id={`goal-${g.id}`} type="range" min="0" max="100" step="1" value={g.progress} onChange={e=>updateGoal(g.id,Number(e.target.value))}/></div></div>)}</div>}</section><section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">THE HOW</span><h2>Skill matrix</h2><p className="panel-subtitle">Add your own skills and calibrate them using evidence.</p></div><button className="primary-button" onClick={()=>setShowSkill(true)}><Plus size={15}/> Add skill</button></div>{skills.length===0?<EmptyState icon={<TrendingUp size={22}/>} title="No skills tracked" text="Add a skill such as DSA, ML, backend or speaking, then rate your current level."/>:<div className="skills-list">{skills.map(s=><div className="skill-row" key={s.name}><div className="skill-heading"><strong>{s.name}</strong><span>{s.value}/100 <button className="text-link" onClick={()=>setSkills(old=>old.filter(x=>x.name!==s.name))} aria-label={`Remove ${s.name}`}><X size={12}/></button></span></div><Progress value={s.value} tone={s.name.includes('AI')?'green':s.name.includes('Communication')?'orange':'violet'}/><p>{s.evidence}</p><div className="skill-slider"><span>Adjust baseline</span><input type="range" min="0" max="100" step="1" value={s.value} onChange={e=>updateSkill(s.name,Number(e.target.value))}/></div></div>)}</div>}<div className="bottom-note"><div className="note-icon"><CircleHelp size={16}/></div><p><strong>Self-ratings are not proof.</strong> Build evidence into the next version: projects shipped, interview results, recorded talks, course assessments, and timed problem sets.</p></div></section></div>}

        {page==='Integrations'&&<div className="integration-layout"><section className="panel integration-panel"><div className="panel-heading"><div><span className="section-kicker">LIVE CONNECTOR</span><h2>Codeforces</h2><p className="panel-subtitle">Public profile, current rating, and solved problems from recent submissions.</p></div><div className="provider-logo cf-logo">CF</div></div><form className="connect-form" onSubmit={connectCodeforces}><label>Codeforces handle</label><div className="connect-input"><input value={cfHandle} onChange={e=>setCfHandle(e.target.value)} placeholder="e.g. tourist"/><button className="primary-button" disabled={cfLoading}>{cfLoading?'Connecting...':'Fetch stats'} <ArrowRight size={15}/></button></div><small>Public API only. No password or API secret is needed for public profile stats.</small></form>{cfError&&<div className="error-box">{cfError}</div>}{cfStats&&<div className="cf-results"><div className="connected-header"><span className="status-dot"/> Fetched profile for <strong>{cfHandle}</strong></div><div className="cf-stat-grid"><div><span>Current rating</span><strong>{cfStats.rating||'-'}</strong></div><div><span>Max rating</span><strong>{cfStats.maxRating||'-'}</strong></div><div><span>Rank</span><strong className="capitalize">{cfStats.rank}</strong></div><div><span>Unique solved in latest 1,000 submissions</span><strong>{cfStats.solved}</strong></div></div><p className="muted small">The solved count is an estimate from the latest 1,000 submissions, not a lifetime total.</p></div>}</section>
          <section className="panel integration-panel"><div className="panel-heading"><div><span className="section-kicker">PLAYLIST IMPORT</span><h2>YouTube playlist importer</h2><p className="panel-subtitle">Import up to 50 videos from a public playlist. Imported videos start at 0% progress.</p></div><div className="provider-logo" style={{background:'#42252b',color:'#ff929b'}}>YT</div></div><form className="connect-form" onSubmit={importYouTubePlaylist}><label>YouTube Data API key<input className="standalone-input" type="password" value={ytKey} onChange={e=>setYtKey(e.target.value)} placeholder="Paste API key" autoComplete="off"/></label><label style={{marginTop:12}}>Playlist URL or ID<input className="standalone-input" value={ytPlaylist} onChange={e=>setYtPlaylist(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..."/></label><div className="connect-input"><button className="primary-button" disabled={ytLoading}>{ytLoading?'Importing...':'Import playlist'} <ArrowRight size={15}/></button></div><small>Enable YouTube Data API v3 in Google Cloud Console. Restrict your API key to this API and your local site. The key is stored in this browser only.</small></form>{ytError&&<div className="error-box">{ytError}</div>}</section>
          <section className="panel integration-panel"><div className="panel-heading"><div><span className="section-kicker">NEXT CONNECTORS</span><h2>Learning platforms</h2><p className="panel-subtitle">Connector status is explicit, so imported and manually tracked data won't be confused.</p></div></div><div className="connector-list"><Connector name="YouTube" detail="Playlist metadata via YouTube Data API v3; OAuth needed for personal/private playlists." badge="API key / OAuth" symbol={<span className="yt-logo">â–¶</span>}/><Connector name="LeetCode" detail="No stable general-purpose official public API for this use case; start with manual logging or a carefully reviewed third-party integration." badge="Manual first" symbol={<Code2 size={18}/>}/><Connector name="Striver / takeUforward" detail="Track sheet topics and completion manually; use course links and personal checklists." badge="Resource tracking" symbol={<Target size={18}/>}/><Connector name="Coursera" detail="Personal learning tracking can start with links and manual progress; API access may depend on an organizational agreement." badge="Access dependent" symbol={<GraduationCap size={18}/>}/><Connector name="MIT OCW / Stanford Online" detail="Save course links and milestones now; add provider-specific imports where an appropriate interface exists." badge="Resource tracking" symbol={<BookOpen size={18}/>}/><Connector name="Google Skills / NVIDIA" detail="Catalog courses and record completions; automate only through supported access methods." badge="Future connector" symbol={<Zap size={18}/>}/></div></section>
          <section className="panel integration-panel"><div className="panel-heading"><div><span className="section-kicker">YOUR DATA</span><h2>Portability & reminders</h2></div></div><div className="data-action"><div className="data-action-icon"><ExternalLink size={18}/></div><div><strong>Export local backup</strong><p>Download your tasks, saved resources, goals, and skill ratings as a JSON file.</p></div><button className="secondary-button" onClick={exportData}>Export JSON</button></div><div className="data-action"><div className="data-action-icon"><BookOpen size={18}/></div><div><strong>Restore from backup</strong><p>Import an earlier Ascend JSON backup. Merge or replace after validating the records.</p></div><button className="secondary-button" onClick={()=>backupInputRef.current?.click()}>Import JSON</button><input ref={backupInputRef} type="file" accept="application/json,.json" onChange={importBackup} style={{display:"none"}}/></div><div className="data-action"><div className="data-action-icon"><Bell size={18}/></div><div><strong>Browser reminders</strong><p>While the app is open, scheduled tasks can trigger notifications if permission is granted.</p></div><button className="secondary-button" onClick={enableNotifications}>Enable</button></div><div className="warning-note"><CircleHelp size={17}/><p><strong>Reminder limitation:</strong> this MVP checks due times only while the page is open. To send reminders when the browser is closed, deploy a backend scheduler and a delivery channel such as email or push notifications.</p></div></section>
        </div>}
        <footer className="footer"><span>ASCEND OS <span className="footer-dot"> | </span> BUILD YOUR OWN MOMENTUM</span><span>Prototype v0.1 <span className="footer-dot"> | </span> Cloud workspace</span></footer>
      </div>
    </main>

    {showTask&&<Modal title="Add a task" subtitle="Give the next action a name, time, and priority." onClose={()=>setShowTask(false)}><form className="modal-form" onSubmit={addTask}><label>Task name<input required autoFocus value={taskDraft.title} onChange={e=>setTaskDraft({...taskDraft,title:e.target.value})} placeholder="e.g. Solve 2 graph problems"/></label><div className="form-two"><label>Area<select value={taskDraft.area} onChange={e=>setTaskDraft({...taskDraft,area:e.target.value})}>{['DSA','AI / ML','Backend','Project','Communication','System Design','Career','Other'].map(a=><option key={a}>{a}</option>)}</select></label><label>Priority<select value={taskDraft.priority} onChange={e=>setTaskDraft({...taskDraft,priority:e.target.value as Task['priority']})}>{['High','Medium','Low'].map(p=><option key={p}>{p}</option>)}</select></label></div><div className="form-two"><label>Due date<input required type="date" value={taskDraft.due} onChange={e=>setTaskDraft({...taskDraft,due:e.target.value})}/></label><label>Reminder time<input required type="time" value={taskDraft.time} onChange={e=>setTaskDraft({...taskDraft,time:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowTask(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save task</button></div></form></Modal>}
    {showResource&&<Modal title="Add a learning resource" subtitle="Save the link now. You can update progress as you learn." onClose={()=>setShowResource(false)}><form className="modal-form" onSubmit={addResource}><label>Resource title<input required autoFocus value={resourceDraft.title} onChange={e=>setResourceDraft({...resourceDraft,title:e.target.value})} placeholder="e.g. Stanford CS229 playlist"/></label><label>URL<input required type="url" value={resourceDraft.url} onChange={e=>setResourceDraft({...resourceDraft,url:e.target.value})} placeholder="https://..."/></label><div className="form-two"><label>Provider<input value={resourceDraft.provider} onChange={e=>setResourceDraft({...resourceDraft,provider:e.target.value})} placeholder="YouTube, MIT OCW..."/></label><label>Category<select value={resourceDraft.category} onChange={e=>setResourceDraft({...resourceDraft,category:e.target.value})}>{['DSA','AI / ML','Backend','System Design','Communication','Cloud','Frontend','Other'].map(a=><option key={a}>{a}</option>)}</select></label></div><label>Resource type<select value={resourceDraft.kind} onChange={e=>setResourceDraft({...resourceDraft,kind:e.target.value})}>{['Playlist','Course','Learning path','Article','Documentation','Book','Practice set','Other'].map(a=><option key={a}>{a}</option>)}</select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowResource(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save resource</button></div></form></Modal>}

    {showGoal&&<Modal title="Add a goal" subtitle="Define an outcome you want to achieve." onClose={()=>setShowGoal(false)}><form className="modal-form" onSubmit={addGoal}><label>Goal title<input required autoFocus value={goalDraft.title} onChange={e=>setGoalDraft({...goalDraft,title:e.target.value})} placeholder="e.g. Ship an AI project"/></label><label>Why / success criteria<input value={goalDraft.detail} onChange={e=>setGoalDraft({...goalDraft,detail:e.target.value})} placeholder="How will you know it is done?"/></label><div className="form-two"><label>Target date<input type="date" value={goalDraft.target} onChange={e=>setGoalDraft({...goalDraft,target:e.target.value})}/></label><label>Starting progress (%)<input type="number" min="0" max="100" value={goalDraft.progress} onChange={e=>setGoalDraft({...goalDraft,progress:Number(e.target.value)})}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowGoal(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save goal</button></div></form></Modal>}
    {showSkill&&<Modal title="Add a skill" subtitle="Track the skills that matter to your goals." onClose={()=>setShowSkill(false)}><form className="modal-form" onSubmit={addSkill}><label>Skill name<input required autoFocus value={skillDraft.name} onChange={e=>setSkillDraft({...skillDraft,name:e.target.value})} placeholder="e.g. Public speaking"/></label><label>Evidence / how you measure it<input value={skillDraft.evidence} onChange={e=>setSkillDraft({...skillDraft,evidence:e.target.value})} placeholder="e.g. presentations, timed assessments"/></label><label>Current level (0-100)<input type="number" min="0" max="100" value={skillDraft.value} onChange={e=>setSkillDraft({...skillDraft,value:Number(e.target.value)})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowSkill(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save skill</button></div></form></Modal>}
    {showProblem&&<Modal title="Add a DSA problem" subtitle="Log a problem you choose to work on." onClose={()=>setShowProblem(false)}><form className="modal-form" onSubmit={addProblem}><label>Problem name<input required autoFocus value={problemDraft.title} onChange={e=>setProblemDraft({...problemDraft,title:e.target.value})} placeholder="Problem title"/></label><label>Problem URL (optional)<input type="url" value={problemDraft.url} onChange={e=>setProblemDraft({...problemDraft,url:e.target.value})} placeholder="https://leetcode.com/problems/..."/></label><div className="form-two"><label>Platform<select value={problemDraft.platform} onChange={e=>setProblemDraft({...problemDraft,platform:e.target.value})}>{['LeetCode','Codeforces','Striver','GeeksforGeeks','Other'].map(x=><option key={x}>{x}</option>)}</select></label><label>Topic<input value={problemDraft.topic} onChange={e=>setProblemDraft({...problemDraft,topic:e.target.value})} placeholder="Arrays, DP..."/></label></div><div className="form-two"><label>Difficulty<select value={problemDraft.difficulty} onChange={e=>setProblemDraft({...problemDraft,difficulty:e.target.value as Problem['difficulty']})}>{['Easy','Medium','Hard'].map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select value={problemDraft.status} onChange={e=>setProblemDraft({...problemDraft,status:e.target.value as Problem['status']})}>{['Todo','Attempted','Solved'].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Next revision date (optional)<input type="date" value={problemDraft.nextReview} onChange={e=>setProblemDraft({...problemDraft,nextReview:e.target.value})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowProblem(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save problem</button></div></form></Modal>}



  </div>
}

function TaskRow({task,onToggle,onDelete,detailed=false}:{task:Task;onToggle:(id:string)=>void;onDelete?:(id:string)=>void;detailed?:boolean}) {return <div className={`task-row ${task.done?'task-done':''} ${detailed?'detailed':''}`}><button className={`check-control ${task.done?'checked':''}`} onClick={()=>onToggle(task.id)} aria-label={task.done?'Mark incomplete':'Complete task'}>{task.done&&<Check size={14}/>}</button><div className="task-main"><strong>{task.title}</strong><div className="task-meta"><span className={`task-area ${task.area==='DSA'?'area-violet':task.area==='AI / ML'?'area-green':task.area==='Communication'?'area-orange':'area-blue'}`}>{task.area}</span>{detailed&&<span>{prettyDate(task.due)}</span>}<span><Clock3 size={12}/>{task.time}</span></div></div><span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span>{onDelete&&<button className="icon-button" aria-label="Delete task" onClick={()=>onDelete(task.id)}><X size={13}/></button>}</div>}
function EmptyState({icon,title,text}:{icon:ReactNode;title:string;text:string}){return <div className="empty-state"><div>{icon}</div><strong>{title}</strong><p>{text}</p></div>}
function Modal({title,subtitle,onClose,children}:{title:string;subtitle:string;onClose:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal"><div className="modal-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</section></div>}
function Connector({name,detail,badge,symbol}:{name:string;detail:string;badge:string;symbol:ReactNode}){return <div className="connector-row"><div className="connector-symbol">{symbol}</div><div className="connector-main"><strong>{name}</strong><p>{detail}</p></div><span className="connector-badge">{badge}</span></div>}

