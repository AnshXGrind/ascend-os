import { createContext, useContext, type ReactNode } from 'react'
import type { AppViewModel } from '../hooks/useAscendApp'
const AppContext = createContext<AppViewModel | null>(null)
export function AppProvider({ value, children }: { value: AppViewModel; children: ReactNode }) {
 return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export function useAppContext(): AppViewModel {
 const value = useContext(AppContext)
 if (!value) throw new Error('useAppContext must be used within AppProvider')
 return value
}
