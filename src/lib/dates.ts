export function todayISO() {
 const d = new Date()
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function localDateISO(d: Date) {
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function currentTimeHHMM() {
 const d = new Date()
 return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
export function prettyDate(iso: string) {
 if (!iso) return 'No date'
 return new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
export function formatDuration(totalSeconds: number) {
 const total = Math.max(0, Math.floor(totalSeconds))
 const hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60), seconds = total % 60
 return hours > 0 ? `${hours}h ${String(minutes).padStart(2,'0')}m`
  : minutes > 0 ? `${minutes}m ${String(seconds).padStart(2,'0')}s` : `${seconds}s`
}
