import { useAppContext } from '../../context/AppContext'
import { Modal } from '../../components/ui/Shared'
import { Plus } from 'lucide-react'

export default function SkillFormModal() {
 const { showSkill, setShowSkill, skillDraft, setSkillDraft, addSkill } = useAppContext()
 return <>{showSkill && (
  <Modal title="Add a skill" subtitle="Track the skills that matter to your goals." onClose={()=>setShowSkill(false)}><form className="modal-form" onSubmit={addSkill}><label>Skill name<input required autoFocus value={skillDraft.name} onChange={e=>setSkillDraft({...skillDraft,name:e.target.value})} placeholder="e.g. Public speaking"/></label><label>Evidence / how you measure it<input value={skillDraft.evidence} onChange={e=>setSkillDraft({...skillDraft,evidence:e.target.value})} placeholder="e.g. presentations, timed assessments"/></label><label>Current level (0-100)<input type="number" min="0" max="100" value={skillDraft.value} onChange={e=>setSkillDraft({...skillDraft,value:Number(e.target.value)})}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowSkill(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save skill</button></div></form></Modal>
 )}</>
}
