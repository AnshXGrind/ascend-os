import { Check, X } from 'lucide-react'
import { useAscendApp } from './hooks/useAscendApp'
import { AppProvider, useAppContext } from './context/AppContext'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import PageHeader from './components/layout/PageHeader'
import OverviewPage from './features/overview/OverviewPage'
import PlannerPage from './features/planner/PlannerPage'
import FocusActivityPage from './features/focus/FocusActivityPage'
import LearningLibraryPage from './features/learning/LearningLibraryPage'
import DsaTrackerPage from './features/dsa/DsaTrackerPage'
import GoalsSkillsPage from './features/growth/GoalsSkillsPage'
import IntegrationsPage from './features/integrations/IntegrationsPage'
import TaskFormModal from './features/planner/TaskFormModal'
import ResourceFormModal from './features/learning/ResourceFormModal'
import GoalFormModal from './features/growth/GoalFormModal'
import SkillFormModal from './features/growth/SkillFormModal'
import ProblemFormModal from './features/dsa/ProblemFormModal'

export default function App() {
 const model = useAscendApp()
 return <AppProvider value={model}><WorkspaceApp /></AppProvider>
}
function WorkspaceApp() {
 const { page, notice, setNotice } = useAppContext()
   return <div className="app-shell">
    <Sidebar />

    <main className="main-area">
      <Topbar />
      <div className="page-wrap">
        {notice&&<div className="toast"><Check size={15}/>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
        <PageHeader />

        {page === 'Overview' && <OverviewPage />}
        {page === 'Planner' && <PlannerPage />}
        {page === 'Focus & activity' && <FocusActivityPage />}
        {page === 'Learning library' && <LearningLibraryPage />}
        {page === 'DSA tracker' && <DsaTrackerPage />}
        {page === 'Goals & skills' && <GoalsSkillsPage />}
        {page === 'Integrations' && <IntegrationsPage />}

        <footer className="footer"><span>ASCEND OS <span className="footer-dot"> | </span> BUILD YOUR OWN MOMENTUM</span><span>Prototype v0.1 <span className="footer-dot"> | </span> Cloud workspace</span></footer>
      </div>
    </main>

    <TaskFormModal />
    <ResourceFormModal />
    <GoalFormModal />
    <SkillFormModal />
    <ProblemFormModal />

  </div>
}
