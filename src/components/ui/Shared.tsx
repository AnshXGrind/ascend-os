import type { ReactNode } from 'react'
import { Check, Clock3, X } from 'lucide-react'
import type { Task } from '../../types/models'
import { prettyDate } from '../../lib/dates'

export function IconBadge({ children, className = '' }: { children: ReactNode; className?: string }) {
 return <span className={`icon-badge ${className}`}>{children}</span>
}
export function Progress({ value, tone = 'violet' }: { value: number; tone?: string }) {
 return <div className={`progress ${tone}`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}
export function TaskRow({ task, onToggle, onDelete, detailed = false }: { task: Task; onToggle: (id: string) => void; onDelete?: (id: string) => void; detailed?: boolean }) {
 return <div className={`task-row ${task.done ? 'task-done' : ''} ${detailed ? 'detailed' : ''}`}>
  <button className={`check-control ${task.done ? 'checked' : ''}`} onClick={() => onToggle(task.id)} aria-label={task.done ? 'Mark incomplete' : 'Complete task'}>{task.done && <Check size={14} />}</button>
  <div className="task-main"><strong>{task.title}</strong><div className="task-meta"><span className={`task-area ${task.area === 'DSA' ? 'area-violet' : task.area === 'AI / ML' ? 'area-green' : task.area === 'Communication' ? 'area-orange' : 'area-blue'}`}>{task.area}</span>{detailed && <span>{prettyDate(task.due)}</span>}<span><Clock3 size={12} />{task.time}</span></div></div>
  <span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span>
  {onDelete && <button className="icon-button" aria-label="Delete task" onClick={() => onDelete(task.id)}><X size={13} /></button>}
 </div>
}
export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
 return <div className="empty-state"><div>{icon}</div><strong>{title}</strong><p>{text}</p></div>
}
export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
 return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><section className="modal"><div className="modal-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>{children}</section></div>
}
export function Connector({ name, detail, badge, symbol }: { name: string; detail: string; badge: string; symbol: ReactNode }) {
 return <div className="connector-row"><div className="connector-symbol">{symbol}</div><div className="connector-main"><strong>{name}</strong><p>{detail}</p></div><span className="connector-badge">{badge}</span></div>
}
