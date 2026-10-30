const API = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const KEY = 'studyos_token'
export type User = { id: number; name: string; email: string }
export type Task = { id: number; title: string; subject: string | null; scheduled_at: string | null; is_completed: boolean }
async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers); headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  const saved = sessionStorage.getItem(KEY); if (auth && saved) headers.set('Authorization', 'Bearer ' + saved)
  const response = await fetch(API + path, { ...init, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || (response.status === 401 ? 'Please sign in again.' : 'Request failed.'))
  return body as T
}
export async function login(email: string, password: string) { const r = await request<{user:User;token:string}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})},false); sessionStorage.setItem(KEY,r.token); return r.user }
export async function register(name:string,email:string,password:string,password_confirmation:string) { const r=await request<{user:User;token:string}>('/auth/register',{method:'POST',body:JSON.stringify({name,email,password,password_confirmation})},false);sessionStorage.setItem(KEY,r.token);return r.user }
export const hasToken = () => Boolean(sessionStorage.getItem(KEY))
export const me = () => request<{user:User}>('/auth/me').then(r=>r.user)
export async function logout(){try{await request('/auth/logout',{method:'POST'})}finally{sessionStorage.removeItem(KEY)}}
export const listTasks = () => request<{data:Task[]}>('/tasks').then(r=>r.data)
export const createTask = (title:string,subject:string) => request<{data:Task}>('/tasks',{method:'POST',body:JSON.stringify({title,subject})}).then(r=>r.data)
export const updateTask = (id:number,is_completed:boolean) => request<{data:Task}>('/tasks/'+id,{method:'PATCH',body:JSON.stringify({is_completed})}).then(r=>r.data)
export const deleteTask = (id:number) => request<void>('/tasks/'+id,{method:'DELETE'})
export type Subject = { id:number; name:string; created_at?:string; updated_at?:string }
export const listSubjects = () => request<{data:Subject[]}>('/subjects').then(r=>r.data)
export const createSubject = (name:string) => request<{data:Subject}>('/subjects',{method:'POST',body:JSON.stringify({name})}).then(r=>r.data)
export const deleteSubject = (id:number) => request<void>('/subjects/'+id,{method:'DELETE'})
