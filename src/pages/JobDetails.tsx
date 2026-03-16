import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Layout } from "@/components/layout/Layout";
import { Button } from "../components/ui/button";
import { ArrowLeft, Camera, Upload, CheckCircle2, PackagePlus, Trash2 } from "lucide-react";
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
  }, [id]);

  const fetchJobDetails = async () => {
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
    } catch (error: any) {
      console.error('Error fetching job details:', error);
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
      
    } catch (error: any) {
      console.error("Error linking part:", error);
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
    } catch (error) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error(error);
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
              <p className="font-medium">{job.customer_phone || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created On</p>
              <p className="font-medium">{format(new Date(job.created_at), 'PPP')}</p>
            </div>
          </div>

          <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Repair Ticket</h2>
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Device</p>
                <p className="font-medium">{job.device_model}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Charge</p>
                <p className="font-medium text-lg text-green-600 dark:text-green-500">AED {job.price_charged}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Issue Description</p>
              <p className="mt-1 whitespace-pre-wrap">{job.issue}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-lg shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold">Parts Used</h2>
          </div>
          
          <div className="space-y-4">
             {linkedParts.length > 0 ? (
               <div className="divide-y border rounded-md">
                 {linkedParts.map(link => (
                   <div key={link.id} className="p-3 flex items-center justify-between bg-muted/30">
                     <div>
                       <p className="font-medium">{link.inventory_items?.parts?.name}</p>
                       <p className="text-xs text-muted-foreground font-mono">QR: {link.inventory_items?.qr_code || link.inventory_item_id.split('-')[0]}</p>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="font-medium text-green-600 dark:text-green-500">AED {link.inventory_items?.parts?.selling_price}</span>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-8 w-8 text-destructive"
                         onClick={() => handleUnlinkPart(link.id, link.inventory_item_id, link.inventory_items?.parts?.selling_price || 0)}
                         disabled={updating}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-muted-foreground italic">No parts have been assigned to this job yet.</p>
             )}

             <div className="pt-4 flex items-center gap-3">
               <Select 
                 value={selectedInventoryId} 
                 onValueChange={setSelectedInventoryId}
                 disabled={updating || availableParts.length === 0}
               >
                 <SelectTrigger className="flex-1">
                   <SelectValue placeholder={availableParts.length > 0 ? "Select a part from inventory to assign..." : "No items available in stock"} />
                 </SelectTrigger>
                 <SelectContent>
                   {availableParts.map(item => (
                     <SelectItem key={item.id} value={item.id}>
                       {item.parts?.name} <span className="text-muted-foreground text-xs ml-2 font-mono">({item.qr_code || item.id.split('-')[0]})</span> - AED {item.parts?.selling_price}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
               <Button onClick={handleLinkPart} disabled={!selectedInventoryId || updating}>
                 <PackagePlus className="h-4 w-4 mr-2" /> Add Part
               </Button>
             </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-lg shadow-sm space-y-6">
          <h2 className="text-lg font-semibold border-b pb-2">Proof of Repair (Photos)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Before Photo */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center justify-between">
                Before Repair
                {job.before_photo_url && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </h3>
              {job.before_photo_url ? (
                 <div className="aspect-video relative rounded-md overflow-hidden border bg-muted">
                   <img src={job.before_photo_url} alt="Before repair" className="object-cover w-full h-full" />
                 </div>
              ) : (
                <div className="aspect-video rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                  <Camera className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No photo uploaded</p>
                </div>
              )}
              
              <div>
                <Button 
                  variant="outline" 
                  className="w-full relative overflow-hidden" 
                  disabled={uploadingImage === 'before'}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleImageUpload(e, 'before')}
                    disabled={uploadingImage === 'before'}
                  />
                  {uploadingImage === 'before' ? "Uploading..." : <><Upload className="mr-2 h-4 w-4" /> {job.before_photo_url ? "Replace Photo" : "Upload Photo"}</>}
                </Button>
              </div>
            </div>

            {/* After Photo */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center justify-between">
                After Repair
                 {job.after_photo_url && <CheckCircle2 className="h-4 w-4 text-green-500" />}
              </h3>
              {job.after_photo_url ? (
                 <div className="aspect-video relative rounded-md overflow-hidden border bg-muted">
                   <img src={job.after_photo_url} alt="After repair" className="object-cover w-full h-full" />
                 </div>
              ) : (
                <div className="aspect-video rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
                  <Camera className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No photo uploaded</p>
                </div>
              )}
              
              <div>
                <Button 
                  variant="outline" 
                  className="w-full relative overflow-hidden"
                  disabled={uploadingImage === 'after'}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleImageUpload(e, 'after')}
                    disabled={uploadingImage === 'after'}
                  />
                  {uploadingImage === 'after' ? "Uploading..." : <><Upload className="mr-2 h-4 w-4" /> {job.after_photo_url ? "Replace Photo" : "Upload Photo"}</>}
                </Button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </Layout>
  );
}
