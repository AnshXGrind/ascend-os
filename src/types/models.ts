// Shared domain models used by feature views, workspace state and cloud persistence.
export type Task = { id: string; title: string; area: string; due: string; time: string; priority: 'High'|'Medium'|'Low'; done: boolean; completedAt?: string }
export type Resource = { id: string; title: string; provider: string; category: string; url: string; progress: number; status: 'In progress'|'Queued'|'Completed'; kind: string; playlistId?: string; playlistPosition?: number }
export type Goal = { id: string; title: string; detail: string; progress: number; target: string; color: string }
export type Skill = { name: string; value: number; evidence: string }
export type Problem = { id:string; title:string; platform:string; topic:string; difficulty:'Easy'|'Medium'|'Hard'; url:string; status:'Todo'|'Attempted'|'Solved'; nextReview:string }
// ASCEND EXECUTION ENGINE V1
export type FocusSession = { id:string; title:string; taskId?:string; startedAt:string; endedAt:string; durationSeconds:number; note:string }
export type ActivityEntry = { id:string; kind:'focus'|'task'|'resource'|'problem'; title:string; detail:string; at:string }
export type FocusTimerState = { title:string; taskId:string; note:string; startedAt:string|null; seconds:number; running:boolean }
export type Page = 'Overview'|'Planner'|'Focus & activity'|'Learning library'|'DSA tracker'|'Goals & skills'|'Integrations'
