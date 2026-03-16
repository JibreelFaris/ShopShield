import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Layout } from "@/components/layout/Layout";
import { Button } from "../components/ui/button";
import { Plus, Search, MoreVertical } from "lucide-react";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import type { Database } from "../lib/database.types";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Link } from "react-router-dom";

type Job = Database['public']['Tables']['jobs']['Row'];

export function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'collected': return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.device_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Jobs & Repairs</h1>
          <Button asChild>
            <Link to="/jobs/new">
              <Plus className="mr-2 h-4 w-4" /> New Job
            </Link>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers or devices..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading jobs...
                  </TableCell>
                </TableRow>
              ) : filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No jobs found. Create your first repair job above.
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">
                      {job.id.split('-')[0]}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{job.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{job.customer_phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{job.device_model}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={job.issue}>
                        {job.issue}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(job.status)}>
                        {job.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(job.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/jobs/${job.id}`}>View Details</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
