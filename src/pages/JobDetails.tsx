import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Layout } from "@/components/layout/Layout";
import { Button } from "../components/ui/button";
import { ArrowLeft, Camera, PackagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "../lib/database.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { format } from "date-fns";

type Job = Database['public']['Tables']['jobs']['Row'];
type JobStatus = Job['status'];
type Part = Database['public']['Tables']['parts']['Row'];
type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type JobPart = Database['public']['Tables']['job_parts']['Row'];

interface LinkedPart extends JobPart {
  inventory_items: {
    qr_code: string;
    parts: {
      name: string;
      selling_price: number;
    }
  }
}

export function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'before' | 'after' | null>(null);
  const [linkedParts, setLinkedParts] = useState<LinkedPart[]>([]);
  const [availableParts, setAvailableParts] = useState<(InventoryItem & { parts: Part })[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");

  useEffect(() => {
    fetchJobDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchJobDetails = async (): Promise<void> => {
    try {
      if (!id) return;
      
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();
        
      if (jobError) throw jobError;
      setJob(jobData);

      fetchLinkedParts(jobData.id);
      fetchAvailableInventory(jobData.org_id);
    } catch (err) {
      console.error('Error fetching job details:', err);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedParts = async (jobId: string) => {
    const { data, error } = await supabase
      .from('job_parts')
      .select(`
        *,
        inventory_items (
          qr_code,
          parts (
            name,
            selling_price
          )
        )
      `)
      .eq('job_id', jobId);
      
    if (!error && data) {
      setLinkedParts(data as unknown as LinkedPart[]);
    }
  };

  const fetchAvailableInventory = async (orgId: string) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        parts (*)
      `)
      .eq('org_id', orgId)
      .eq('status', 'in_stock');

    if (!error && data) {
      setAvailableParts(data as unknown as (InventoryItem & { parts: Part })[]);
    }
  };

  const handleLinkPart = async () => {
    if (!job || !selectedInventoryId) return;
    setUpdating(true);
    
    try {
      const selectedItem = availableParts.find(p => p.id === selectedInventoryId);
      if (!selectedItem) throw new Error("Item not found");

      // 1. Create Link
      const { error: linkError } = await supabase
        .from('job_parts')
        .insert({
          org_id: job.org_id,
          job_id: job.id,
          inventory_item_id: selectedInventoryId
        });
        
      if (linkError) throw linkError;

      // 2. Mark item as used
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ status: 'used' })
        .eq('id', selectedInventoryId);

      if (updateError) throw updateError;

      // 3. Update job total price
      const newTotal = (job.price_charged || 0) + (selectedItem.parts?.selling_price || 0);
      await supabase
        .from('jobs')
        .update({ price_charged: newTotal })
        .eq('id', job.id);

      // Refresh data
      setJob({ ...job, price_charged: newTotal });
      await fetchLinkedParts(job.id);
      await fetchAvailableInventory(job.org_id);
      setSelectedInventoryId("");
      toast.success("Part linked to job successfully");
      
    } catch (err) {
      console.error("Error linking part:", err);
      toast.error("Failed to link part");
    } finally {
      setUpdating(false);
    }
  };

  const handleUnlinkPart = async (jobPartId: string, inventoryItemId: string, priceToDeduct: number) => {
    if (!job) return;
    setUpdating(true);
    
    try {
      // 1. Delete link
      await supabase.from('job_parts').delete().eq('id', jobPartId);
      
      // 2. Return item to stock
      await supabase.from('inventory_items').update({ status: 'in_stock' }).eq('id', inventoryItemId);
      
      // 3. Deduct price
      const newTotal = Math.max(0, (job.price_charged || 0) - priceToDeduct);
      await supabase.from('jobs').update({ price_charged: newTotal }).eq('id', job.id);

      // Refresh data
      setJob({ ...job, price_charged: newTotal });
      await fetchLinkedParts(job.id);
      await fetchAvailableInventory(job.org_id);
      toast.success("Part unlinked and returned to stock");
    } catch (err) {
      console.error("Error unlinking part:", err);
      toast.error("Failed to unlink part");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job) return;
    setUpdating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', job.id);
        
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        org_id: job.org_id,
        user_id: userData.user?.id,
        action: "updated_status",
        entity_type: "job",
        entity_id: job.id,
        details: { old_status: job.status, new_status: newStatus }
      });

      setJob({ ...job, status: newStatus });
      toast.success('Job status updated');
    } catch (err) {
      console.error("Error updating job status:", err);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    if (!e.target.files || e.target.files.length === 0 || !job) return;
    const file = e.target.files[0];
    setUploadingImage(type);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${job.id}/${type}-${Math.random()}.${fileExt}`;
      const filePath = `${job.org_id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(filePath);

      const updateField = type === 'before' ? { before_photo_url: publicUrl } : { after_photo_url: publicUrl };

      const { error: updateError } = await supabase
        .from('jobs')
        .update(updateField)
        .eq('id', job.id);

      if (updateError) throw updateError;
      
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("activity_logs").insert({
        org_id: job.org_id,
        user_id: userData.user?.id,
        action: `uploaded_${type}_photo`,
        entity_type: "job",
        entity_id: job.id,
        details: { url: publicUrl }
      });

      setJob({ ...job, ...updateField });
      toast.success(`${type} photo uploaded successfully`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${type} photo`);
    } finally {
      setUploadingImage(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">Loading job details...</div>
      </Layout>
    );
  }

  if (!job) {
    return (
      <Layout>
        <div className="flex flex-col h-full items-center justify-center space-y-4">
          <p>Job not found.</p>
          <Button asChild><Link to="/jobs">Back to Jobs</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/jobs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{job.device_model}</h1>
              <p className="text-muted-foreground font-mono text-sm">ID: {job.id}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium">Status:</div>
            <Select 
              value={job.status} 
              onValueChange={(val: JobStatus) => handleStatusChange(val)}
              disabled={updating}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Customer Details</h2>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{job.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{job.customer_phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Device Model</p>
              <p className="font-medium">{job.device_model}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issue Description</p>
              <p className="font-medium">{job.issue}</p>
            </div>
          </div>

          <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Job Summary</h2>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{job.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{format(new Date(job.created_at), 'PPP p')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Price</p>
              <p className="font-medium text-lg text-green-600">AED {(job.price_charged || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Before Photo</h2>
            {job.before_photo_url ? (
              <img src={job.before_photo_url} alt="Before" className="w-full h-64 object-cover rounded" />
            ) : (
              <div className="w-full h-64 bg-muted flex items-center justify-center rounded">
                <p className="text-muted-foreground">No photo uploaded</p>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
              <Camera className="h-4 w-4" />
              Upload Before Photo
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} className="hidden" disabled={uploadingImage === 'before'} />
            </label>
          </div>

          <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">After Photo</h2>
            {job.after_photo_url ? (
              <img src={job.after_photo_url} alt="After" className="w-full h-64 object-cover rounded" />
            ) : (
              <div className="w-full h-64 bg-muted flex items-center justify-center rounded">
                <p className="text-muted-foreground">No photo uploaded</p>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 cursor-pointer bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
              <Camera className="h-4 w-4" />
              Upload After Photo
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} className="hidden" disabled={uploadingImage === 'after'} />
            </label>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Parts Used</h2>
          
          {linkedParts.length > 0 && (
            <div className="space-y-2">
              {linkedParts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{part.inventory_items?.parts?.name}</p>
                    <p className="text-sm text-muted-foreground">QR: {part.inventory_items?.qr_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">AED {(part.inventory_items?.parts?.selling_price || 0).toFixed(2)}</p>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleUnlinkPart(part.id, part.inventory_item_id, part.inventory_items?.parts?.selling_price || 0)}
                      disabled={updating}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <select 
              value={selectedInventoryId}
              onChange={(e) => setSelectedInventoryId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded bg-background"
            >
              <option value="">Select a part to add...</option>
              {availableParts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.parts?.name} (QR: {item.qr_code})
                </option>
              ))}
            </select>
            <Button 
              onClick={handleLinkPart}
              disabled={!selectedInventoryId || updating}
            >
              <PackagePlus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
