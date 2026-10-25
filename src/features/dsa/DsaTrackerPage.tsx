import { useAppContext } from '../../context/AppContext'
import { EmptyState } from '../../components/ui/Shared'
import { Code2, ExternalLink, Plus, X } from 'lucide-react'
import { todayISO, prettyDate } from '../../lib/dates'
import type { Problem } from '../../types/models'

export default function DsaTrackerPage() {
 const { problems, setProblems, setShowProblem, updateProblem } = useAppContext()
 return (
  <section className="panel full-panel"><div className="panel-heading"><div><span className="section-kicker">PROBLEM LOG  |  REVISION</span><h2>Your DSA workspace</h2><p className="panel-subtitle">Add problems yourself. No example problems are preloaded.</p></div><button className="primary-button" onClick={()=>setShowProblem(true)}><Plus size={16}/> Add problem</button></div><div className="planner-overview"><div><span>Total logged</span><strong>{problems.length}</strong></div><div><span>Solved</span><strong>{problems.filter(p=>p.status==='Solved').length}</strong></div><div><span>To do</span><strong>{problems.filter(p=>p.status==='Todo').length}</strong></div><div><span>Needs revision</span><strong>{problems.filter(p=>p.nextReview&&p.nextReview<=todayISO()&&p.status==='Solved').length}</strong></div></div>{problems.length===0?<EmptyState icon={<Code2 size={22}/>} title="Your problem tracker is empty" text="Add your first LeetCode, Codeforces, or Striver problem. Nothing is prefilled."/>:<div className="problem-list">{problems.map(p=><div className="problem-row" key={p.id}><div className="problem-main"><strong>{p.title}</strong><span>{p.platform}  |  {p.topic}  |  {p.difficulty}{p.nextReview?`  |  Review ${prettyDate(p.nextReview)}`:''}</span></div>{p.url&&<a href={p.url} target="_blank" rel="noreferrer" className="open-resource">Open <ExternalLink size={13}/></a>}<select value={p.status} onChange={e=>updateProblem(p.id,e.target.value as Problem['status'])}><option>Todo</option><option>Attempted</option><option>Solved</option></select><button className="icon-button" aria-label="Delete problem" onClick={()=>setProblems(old=>old.filter(x=>x.id!==p.id))}><X size={15}/></button></div>)}</div>}</section>
 )
}
