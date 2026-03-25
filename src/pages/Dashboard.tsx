import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Store, ClipboardList, Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getOrgId } from "@/lib/auth"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Layout } from "@/components/layout/Layout"
import { format } from "date-fns"

interface RecentJob {
  id: string;
  device_model: string;
  customer_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'collected';
  created_at: string;
}

interface LowStockPart {
  id: string;
  name: string;
  min_stock_level: number;
  in_stock: number;
}

interface DashboardStats {
  jobs: number;
  parts: number;
  sales: number;
  recentJobs: RecentJob[];
  lowStockParts: LowStockPart[];
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    jobs: 0,
    parts: 0,
    sales: 0,
    recentJobs: [],
    lowStockParts: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const orgId = await getOrgId();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Active Jobs Count
      const { count: jobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['pending', 'in_progress'])
      
      // 2. Parts in Stock Count
      const { count: partsCount } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'in_stock')

      // 3. Today's Revenue — combine jobs revenue + sales revenue
      const { data: jobRevenueData } = await supabase
        .from('jobs')
        .select('price_charged')
        .eq('org_id', orgId)
        .gte('created_at', today.toISOString())
        .in('status', ['completed', 'collected'])

      const jobRevenue = (jobRevenueData || []).reduce((sum: number, job: { price_charged: number | null }) => sum + (job.price_charged || 0), 0)

      const { data: saleRevenueData } = await supabase
        .from('sales')
        .select('final_price')
        .eq('org_id', orgId)
        .gte('created_at', today.toISOString())

      const saleRevenue = (saleRevenueData || []).reduce((sum: number, s: { final_price: number | null }) => sum + (s.final_price || 0), 0)

      const todaySales = jobRevenue + saleRevenue

      // 4. Recent Jobs list
      const { data: recentJobs } = await supabase
        .from('jobs')
        .select('id, device_model, customer_name, status, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5)

      // 5. Low Stock Parts logic
      // We calculate stock vs min_stock_level
      const { data: itemsData } = await supabase
        .from('inventory_items')
        .select('part_id')
        .eq('org_id', orgId)
        .eq('status', 'in_stock')

      const stockCounts = (itemsData || []).reduce((acc: Record<string, number>, item: { part_id: string }) => {
         acc[item.part_id] = (acc[item.part_id] || 0) + 1;
         return acc;
      }, {} as Record<string, number>)

      const { data: partCatalog } = await supabase
        .from('parts')
        .select('*')
        .eq('org_id', orgId)
      
      const lowStock = (partCatalog || [])
        .map(p => ({ ...p, in_stock: stockCounts[p.id] || 0 }))
        .filter(p => p.in_stock <= (p.min_stock_level || 0))
        .slice(0, 5)

      setStats({
        jobs: jobsCount || 0,
        parts: partsCount || 0,
        sales: todaySales,
        recentJobs: recentJobs || [],
        lowStockParts: lowStock
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to load dashboard metrics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">Loading dashboard...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-4">
          <Button 
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
            asChild
          >
            <Link to="/sales">
              <DollarSign className="h-4 w-4 mr-2" />
              Quick Sale
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/jobs/new">
              <ClipboardList className="h-4 w-4 mr-2" />
              New Repair Job
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/inventory/new">
              <Package className="h-4 w-4 mr-2" />
              Add Inventory
            </Link>
          </Button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Repair Revenue</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">AED {stats.sales.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">From completed tickets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.jobs}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending & In Progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Parts Stockpile</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.parts}</div>
              <p className="text-xs text-muted-foreground mt-1">Individual trackable items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Connected Shops</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground mt-1">Dubai locations</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Repair Jobs</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/jobs">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentJobs.length > 0 ? (
                  stats.recentJobs.map(job => (
                    <div key={job.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium leading-none">{job.device_model}</p>
                        <p className="text-sm text-muted-foreground mt-1">{job.customer_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                         <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                           job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                           job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                           'bg-green-100 text-green-800'
                         }`}>
                           {job.status.replace('_', ' ')}
                         </span>
                         <span className="text-xs text-muted-foreground">{format(new Date(job.created_at), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No jobs found.</p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Low Stock Alerts
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory">Manage</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.lowStockParts.length > 0 ? (
                  stats.lowStockParts.map(part => (
                    <div key={part.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium leading-none">{part.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">Min required: {part.min_stock_level}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                         <div className="text-sm font-bold text-destructive">
                           {part.in_stock} left
                         </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">All inventory levels are looking healthy!</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  )
}