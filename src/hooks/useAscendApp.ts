import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { ActivityEntry, FocusTimerState, FocusSession, Goal, Page, Problem, Resource, Skill, Task } from '../types/models'
import { currentTimeHHMM, formatDuration, localDateISO, todayISO } from '../lib/dates'

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

export function useAscendApp() {
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


 return {
 page,
 setPage,
 tasks,
 setTasks,
 resources,
 setResources,
 goals,
 setGoals,
 skills,
 setSkills,
 problems,
 setProblems,
 focusSessions,
 setFocusSessions,
 activity,
 setActivity,
 focusTimer,
 setFocusTimer,
 query,
 setQuery,
 resourceCategory,
 setResourceCategory,
 backupInputRef,
 searchInputRef,
 showTask,
 setShowTask,
 showResource,
 setShowResource,
 showGoal,
 setShowGoal,
 showSkill,
 setShowSkill,
 showProblem,
 setShowProblem,
 ytKey,
 setYtKey,
 ytPlaylist,
 setYtPlaylist,
 ytLoading,
 setYtLoading,
 ytError,
 setYtError,
 mobileNav,
 setMobileNav,
 notice,
 setNotice,
 cfHandle,
 setCfHandle,
 cfStats,
 setCfStats,
 cfLoading,
 setCfLoading,
 cfError,
 setCfError,
 taskDraft,
 setTaskDraft,
 resourceDraft,
 setResourceDraft,
 goalDraft,
 setGoalDraft,
 skillDraft,
 setSkillDraft,
 problemDraft,
 setProblemDraft,
 completed,
 openTasks,
 todayTasks,
 pending,
 todayCompletionPct,
 overdue,
 filteredResources,
 completionPct,
 doneResources,
 inProgress,
 weekDays,
 greet,
 logActivity,
 toggleTask,
 deleteTask,
 addTask,
 addResource,
 addGoal,
 addSkill,
 addProblem,
 updateProblem,
 importYouTubePlaylist,
 enableNotifications,
 connectCodeforces,
 finishFocusSession,
 updateGoal,
 updateSkill,
 updateResourceStatus,
 exportData,
 importBackup
 }
}
export type AppViewModel = ReturnType<typeof useAscendApp>
