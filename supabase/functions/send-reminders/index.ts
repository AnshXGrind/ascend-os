import { createClient } from 'npm:@supabase/supabase-js@2'

const projectUrl = Deno.env.get('SUPABASE_URL')
const cronSecret = Deno.env.get('CRON_SECRET')
const resendKey = Deno.env.get('RESEND_API_KEY')
const fromEmail = Deno.env.get('REMINDER_FROM_EMAIL')
const secretMap = (() => { try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}') } catch { return {} } })()
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secretMap.default
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function htmlEscape(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}
function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const values: Record<string, string> = {}
  for (const part of parts) if (part.type !== 'literal') values[part.type] = part.value
  return values
}
function minuteIndex(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return NaN
  return Date.UTC(year, month - 1, day, hour, minute) / 60000
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405)
  if (!cronSecret || req.headers.get('Authorization') !== `Bearer ${cronSecret}`) return json({ error: 'Unauthorized' }, 401)
  if (!projectUrl || !serviceKey) return json({ error: 'Supabase server credentials are not available to this function' }, 500)
  if (!resendKey || !fromEmail) return json({ error: 'Set RESEND_API_KEY and REMINDER_FROM_EMAIL before enabling the schedule' }, 500)

  const admin = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: workspaces, error } = await admin.from('user_workspaces').select('user_id,data,timezone')
  if (error) return json({ error: `Could not read workspaces: ${error.message}` }, 500)

  const now = new Date()
  let sent = 0, skipped = 0, failed = 0
  const failures: string[] = []
  for (const workspace of workspaces || []) {
    const timezone = typeof workspace.timezone === 'string' && workspace.timezone ? workspace.timezone : 'Asia/Kolkata'
    let current: Record<string, string>
    try { current = localParts(now, timezone) } catch { skipped++; continue }
    const currentLocalDate = `${current.year}-${current.month}-${current.day}`
    const nowMinute = minuteIndex(currentLocalDate, `${current.hour}:${current.minute}`)
    const tasks = Array.isArray(workspace.data?.tasks) ? workspace.data.tasks : []
    const dueTasks = tasks.filter((task: any) => {
      if (!task || task.done || !task.id || !task.title || !task.due || !task.time) return false
      const scheduled = minuteIndex(String(task.due), String(task.time))
      const ageMinutes = nowMinute - scheduled
      return Number.isFinite(scheduled) && ageMinutes >= 0 && ageMinutes <= 4
    })
    if (!dueTasks.length) continue

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(workspace.user_id)
    const email = userResult?.user?.email
    if (userError || !email) { skipped += dueTasks.length; continue }

    for (const task of dueTasks) {
      const scheduledLocal = `${task.due}T${task.time}`
      const { data: prior, error: priorError } = await admin.from('reminder_deliveries').select('id').eq('user_id', workspace.user_id).eq('task_id', String(task.id)).eq('due_local', scheduledLocal).maybeSingle()
      if (priorError) { failed++; failures.push(`${workspace.user_id}/${task.id}: delivery lookup failed`); continue }
      if (prior) { skipped++; continue }
      const title = htmlEscape(task.title)
      const area = htmlEscape(task.area || 'Personal development')
      const dueTime = htmlEscape(`${task.due} at ${task.time} (${timezone})`)
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `Ascend OS reminder: ${String(task.title).slice(0, 100)}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#202334"><p style="color:#7565d7;font-weight:bold">ASCEND OS</p><h2>${title}</h2><p>It is time for your scheduled task in <strong>${area}</strong>.</p><p style="color:#616979">Scheduled: ${dueTime}</p><p>Open your Ascend OS workspace to mark progress or reschedule this task.</p></div>`,
          }),
        })
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body?.message || `Email provider returned ${response.status}`)
        const { error: insertError } = await admin.from('reminder_deliveries').insert({ user_id: workspace.user_id, task_id: String(task.id), due_local: scheduledLocal })
        if (insertError) throw new Error(`Email sent but delivery log failed: ${insertError.message}`)
        sent++
      } catch (err) {
        failed++; failures.push(`${workspace.user_id}/${task.id}: ${err instanceof Error ? err.message : 'send failed'}`)
      }
    }
  }
  return json({ ok: failed === 0, sent, skipped, failed, failures: failures.slice(0, 10), checkedAt: now.toISOString() }, failed ? 207 : 200)
})