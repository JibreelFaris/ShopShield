import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Login } from "./pages/Login"
import { Dashboard } from "./pages/Dashboard"
import { Sales } from "./pages/Sales"
import { Toaster } from "./components/ui/sonner"
import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import type { User } from "@supabase/supabase-js"
import { ThemeProvider } from "./components/theme-provider"
import { Jobs } from "./pages/Jobs"
import { NewJob } from "./pages/NewJob"
import { JobDetails } from "./pages/JobDetails"
import { Inventory } from "./pages/Inventory"
import { NewPart } from "./pages/NewPart"
import { InventoryAudit } from "./pages/InventoryAudit"
import { SalesHistory } from "./pages/SalesHistory"

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="shopshield-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/sales" element={user ? <Sales /> : <Navigate to="/login" />} />
          <Route path="/sales/history" element={user ? <SalesHistory /> : <Navigate to="/login" />} />
          <Route path="/jobs" element={user ? <Jobs /> : <Navigate to="/login" />} />
          <Route path="/jobs/new" element={user ? <NewJob /> : <Navigate to="/login" />} />
          <Route path="/jobs/:id" element={user ? <JobDetails /> : <Navigate to="/login" />} />
          <Route path="/inventory" element={user ? <Inventory /> : <Navigate to="/login" />} />
          <Route path="/inventory/new" element={user ? <NewPart /> : <Navigate to="/login" />} />
          <Route path="/inventory/audit" element={user ? <InventoryAudit /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  )
}

// Add this line at the bottom - THIS IS THE FIX
export default App