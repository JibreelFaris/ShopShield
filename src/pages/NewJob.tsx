import { useState } from "react";
import { supabase } from "../lib/supabase";
import { getOrgId } from "../lib/auth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NewJob() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    device_model: "",
    issue: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const orgId = await getOrgId();

      const { data, error } = await supabase.from("jobs").insert({
        org_id: orgId,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        device_model: formData.device_model,
        issue: formData.issue,
        status: "pending",
        technician_id: userData.user.id,
      }).select().single();

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        org_id: orgId,
        user_id: userData.user.id,
        action: "created",
        entity_type: "job",
        entity_id: data.id,
        details: { message: "Job ticket created" }
      });

      toast.success("Job created successfully!");
      navigate(`/jobs/${data.id}`);
    } catch (err) {
      console.error("Error creating job:", err);
      toast.error((err as Error).message || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/jobs">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create New Repair Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 border rounded-lg shadow-sm">
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Customer Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  name="customer_name"
                  required
                  placeholder="John Doe"
                  value={formData.customer_name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone Number</Label>
                <Input
                  id="customer_phone"
                  name="customer_phone"
                  placeholder="+971 50 XXXXXXX"
                  value={formData.customer_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Device Details</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="device_model">Device Model *</Label>
                <Input
                  id="device_model"
                  name="device_model"
                  required
                  placeholder="e.g. iPhone 13 Pro Max"
                  value={formData.device_model}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issue">Reported Issue *</Label>
                <Textarea
                  id="issue"
                  name="issue"
                  required
                  placeholder="Screen cracked, touch not working..."
                  value={formData.issue}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => navigate('/jobs')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Job Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
