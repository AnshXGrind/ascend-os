import { useAppContext } from '../../context/AppContext'
import { Modal } from '../../components/ui/Shared'
import { Plus } from 'lucide-react'
import type { Task } from '../../types/models'

export default function TaskFormModal() {
 const { problems, setShowTask, taskDraft, setTaskDraft, addTask } = useAppContext()
 return <>{showTask && (
  <Modal title="Add a task" subtitle="Give the next action a name, time, and priority." onClose={()=>setShowTask(false)}><form className="modal-form" onSubmit={addTask}><label>Task name<input required autoFocus value={taskDraft.title} onChange={e=>setTaskDraft({...taskDraft,title:e.target.value})} placeholder="e.g. Solve 2 graph problems"/></label><div className="form-two"><label>Area<select value={taskDraft.area} onChange={e=>setTaskDraft({...taskDraft,area:e.target.value})}>{['DSA','AI / ML','Backend','Project','Communication','System Design','Career','Other'].map(a=><option key={a}>{a}</option>)}</select></label><label>Priority<select value={taskDraft.priority} onChange={e=>setTaskDraft({...taskDraft,priority:e.target.value as Task['priority']})}>{['High','Medium','Low'].map(p=><option key={p}>{p}</option>)}</select></label></div><div className="form-two"><label>Due date<input required type="date" value={taskDraft.due} onChange={e=>setTaskDraft({...taskDraft,due:e.target.value})}/></label><label>Reminder time<input required type="time" value={taskDraft.time} onChange={e=>setTaskDraft({...taskDraft,time:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowTask(false)}>Cancel</button><button className="primary-button" type="submit"><Plus size={15}/> Save task</button></div></form></Modal>
 )}</>
}
