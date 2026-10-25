import { useAppContext } from '../../context/AppContext'
import { Bell, Menu, Search } from 'lucide-react'

export default function Topbar() {
 const { page, query, setQuery, searchInputRef, enableNotifications, setMobileNav } = useAppContext()
 return (<header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{page}</strong></div></div><div className="top-actions"><label className="search-box"><Search size={16}/><input ref={searchInputRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search resources..."/><kbd>Ctrl K</kbd></label><button className="icon-button notification-button" title="Enable notifications" onClick={enableNotifications}><Bell size={18}/><span/></button><div className="user-mini">A</div></div></header>)
}
