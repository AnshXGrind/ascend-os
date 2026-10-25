import type { ReactNode } from 'react'
import { useAppContext } from '../../context/AppContext'
import type { Page } from '../../types/models'
import { Activity, ArrowUpRight, BookOpen, CalendarClock, ChevronDown, Code2, Flame, GraduationCap, LayoutDashboard, Settings2, Sparkles, Target, X } from 'lucide-react'

const navItems:{label:Page;icon:ReactNode;section:string}[]=[
    {label:'Overview',icon:<LayoutDashboard size={17}/>,section:'WORKSPACE'},
    {label:'Planner',icon:<CalendarClock size={17}/>,section:'WORKSPACE'},
    {label:'Focus & activity',icon:<Timer size={17}/>,section:'WORKSPACE'},
    {label:'Learning library',icon:<BookOpen size={17}/>,section:'WORKSPACE'},
    {label:'DSA tracker',icon:<Code2 size={17}/>,section:'WORKSPACE'},
    {label:'Goals & skills',icon:<Target size={17}/>,section:'GROWTH'},
    {label:'Integrations',icon:<Activity size={17}/>,section:'SYSTEM'},
  ]

export default function Sidebar() {
 const { page, setPage, mobileNav, setMobileNav, openTasks } = useAppContext()
 return (<aside className={`sidebar ${mobileNav?'show-mobile':''}`}>
      <div className="brand"><div className="brand-mark"><Sparkles size={20}/></div><div><strong>ascend<span>.</span></strong><small>PERSONAL OS</small></div><button className="icon-button mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="profile-card"><div className="avatar">A</div><div className="profile-copy"><strong>My workspace</strong><span>Personal development</span></div><ChevronDown size={15} className="muted"/></div>
      <nav className="side-nav">{['WORKSPACE','GROWTH','SYSTEM'].map(section=><div className="nav-group" key={section}><span className="nav-label">{section}</span>{navItems.filter(n=>n.section===section).map(item=><button key={item.label} className={`nav-item ${page===item.label?'active':''}`} onClick={()=>{setPage(item.label);setMobileNav(false)}}>{item.icon}<span>{item.label}</span>{item.label==='Planner'&&openTasks.length>0&&<em>{openTasks.length}</em>}</button>)}</div>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="streak-card"><div className="streak-icon"><Flame size={18}/></div><div><strong>Build your streak</strong><p>Small steps, every day.</p></div><ArrowUpRight size={15}/></div>
      <button className="nav-item settings-link" onClick={()=>setPage('Integrations')}><Settings2 size={17}/><span>Settings & data</span></button>
      <div className="sidebar-foot"><span className="status-dot"/> Your progress syncs to your cloud workspace</div>
    </aside>)
}
