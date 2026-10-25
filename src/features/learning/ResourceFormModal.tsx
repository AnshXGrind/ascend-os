import { useAppContext } from '../../context/AppContext'
import { Modal } from '../../components/ui/Shared'
import { Plus } from 'lucide-react'

export default function ResourceFormModal() {
 const { showResource, setShowResource, resourceDraft, setResourceDraft, addResource } = useAppContext()
 return <>{showResource && (
  <Modal title="Add a learning resource" subtitle="Save the link now. You can update progress as you learn." onClose={()=>setShowResource(false)}><form className="modal-form" onSubmit={addResource}><label>Resource title<input required autoFocus value={resourceDraft.title} onChange={e=>setResourceDraft({...resourceDraft,title:e.target.value})} placeholder="e.g. Stanford CS229 playlist"/></label><label>URL<input required type="url" value={resourceDraft.url} onChange={e=>setResourceDraft({...resourceDraft,url:e.target.value})} placeholder="https://..."/></label><div className="form-two"><label>Provider<input value={resourceDraft.provider} onChange={e=>setResourceDraft({...resourceDraft,provider:e.target.value})} placeholder="YouTube, MIT OCW..."/></label><label>Category<select value={resourceDraft.category} onChange={e=>setResourceDraft({...resourceDraft,category:e.target.value})}>{['DSA','AI / ML','Backend','System Design','Communication','Cloud','Frontend','Other'].map(a=><option key={a}>{a}</option>)}</select></label></div><label>Resource type<select value={resourceDraft.kind} onChange={e=>setResourceDraft({...resourceDraft,kind:e.target.value})}>{['Playlist','Course','Learning path','Article','Documentation','Book','Practice set','Other'].map(a=><option key={a}>{a}</option>)}</select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowResource(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save resource</button></div></form></Modal>
 )}</>
}
