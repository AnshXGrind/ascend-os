import { useAppContext } from '../../context/AppContext'
import { Modal } from '../../components/ui/Shared'
import { Plus } from 'lucide-react'

export default function GoalFormModal() {
 const { showGoal, setShowGoal, goalDraft, setGoalDraft, addGoal } = useAppContext()
 return <>{showGoal && (
  <Modal title="Add a goal" subtitle="Define an outcome you want to achieve." onClose={()=>setShowGoal(false)}><form className="modal-form" onSubmit={addGoal}><label>Goal title<input required autoFocus value={goalDraft.title} onChange={e=>setGoalDraft({...goalDraft,title:e.target.value})} placeholder="e.g. Ship an AI project"/></label><label>Why / success criteria<input value={goalDraft.detail} onChange={e=>setGoalDraft({...goalDraft,detail:e.target.value})} placeholder="How will you know it is done?"/></label><div className="form-two"><label>Target date<input type="date" value={goalDraft.target} onChange={e=>setGoalDraft({...goalDraft,target:e.target.value})}/></label><label>Starting progress (%)<input type="number" min="0" max="100" value={goalDraft.progress} onChange={e=>setGoalDraft({...goalDraft,progress:Number(e.target.value)})}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowGoal(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save goal</button></div></form></Modal>
 )}</>
}
