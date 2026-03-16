import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getOrgId, getUserId } from "../lib/auth";
import { Layout } from "@/components/layout/Layout";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Scan, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import type { Database } from "../lib/database.types";

type Part = Database['public']['Tables']['parts']['Row'];
type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type ItemWithPart = InventoryItem & { parts: Part };

export function InventoryAudit() {
  const [expectedItems, setExpectedItems] = useState<ItemWithPart[]>([]);
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    fetchExpectedInventory();
  }, []);

  const fetchExpectedInventory = async () => {
    try {
      const orgId = await getOrgId();

      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          parts (*)
        `)
        .eq('org_id', orgId)
        .eq('status', 'in_stock');

      if (error) throw error;
      setExpectedItems(data as unknown as ItemWithPart[]);
    } catch (error) {
      console.error("Error fetching expected inventory:", error);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // In a real app with a barcode scanner, the scanner acts as a keyboard
    // and fires an Enter key event. We check if the scanned QR code exists.
    const foundItem = expectedItems.find(item => 
      item.qr_code === scanInput.trim() || 
      item.id.startsWith(scanInput.trim()) // Fallback for manual short-uuid entry
    );

    if (foundItem) {
      if (scannedIds.has(foundItem.id)) {
        toast.info("Item already scanned!");
      } else {
        const newScanned = new Set(scannedIds);
        newScanned.add(foundItem.id);
        setScannedIds(newScanned);
        toast.success(`Scanned: ${foundItem.parts?.name}`);
      }
    } else {
      toast.error("QR Code not found in stock!");
    }
    
    setScanInput("");
  };

  const completeAudit = async () => {
    if (!confirm("Are you sure you want to complete this audit? Missing items will be marked as 'lost'.") ) return;
    
    setIsAuditing(true);
    try {
      const orgId = await getOrgId();
      const userId = await getUserId();
      
      const missingItems = expectedItems.filter(item => !scannedIds.has(item.id));
      
      if (missingItems.length > 0) {
        const missingIds = missingItems.map(item => item.id);
        
        // 1. Mark items as lost
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ status: 'lost' })
          .in('id', missingIds);

        if (updateError) throw updateError;

        // 2. Log the discrepancy
        await supabase.from("activity_logs").insert({
          org_id: orgId,
          user_id: userId,
          action: "completed_audit_with_loss",
          entity_type: "inventory",
          entity_id: missingIds[0], // Reference the first one or create a dedicated audit table
          details: { 
            message: `Audit completed. ${missingItems.length} items missing.`,
            missing_items: missingItems.map(i => ({ id: i.id, name: i.parts?.name }))
          }
        });
        
        toast.warning(`Audit complete! ${missingItems.length} items have been marked as lost/stolen.`);
      } else {
        // Log perfect audit
        await supabase.from("activity_logs").insert({
          org_id: orgId,
          user_id: userId,
          action: "completed_perfect_audit",
          entity_type: "inventory",
          entity_id: orgId, // Just tracking at org level
          details: { message: `Perfect audit completed. All ${expectedItems.length} items accounted for.` }
        });
        toast.success("Perfect Audit! All stock accounted for.");
      }
      
      // Refresh state
      await fetchExpectedInventory();
      setScannedIds(new Set());
      
    } catch (error) {
      console.error("Audit error:", error);
      toast.error("Failed to complete audit");
    } finally {
      setIsAuditing(false);
    }
  };

  if (loading) return (
    <RoleProtectedRoute requiredRole="owner">
      <Layout>
        <div className="flex h-full items-center justify-center">Loading expected inventory...</div>
      </Layout>
    </RoleProtectedRoute>
  );

  const scannedCount = scannedIds.size;
  const expectedCount = expectedItems.length;
  const progress = expectedCount === 0 ? 100 : Math.round((scannedCount / expectedCount) * 100);

  return (
    <RoleProtectedRoute requiredRole="owner">
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/inventory">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Surprise Inventory Audit</h1>
            <p className="text-muted-foreground">Scan physical parts to reconcile against the database.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 space-y-6">
            
            <div className="p-6 bg-card border rounded-lg shadow-sm space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Scan Item
              </h2>
              <form onSubmit={handleScanSubmit} className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Scan QR code or type ID..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="font-mono"
                />
                <Button type="submit">Enter</Button>
              </form>
              <p className="text-xs text-muted-foreground">Focus the input field above and use your barcode scanner.</p>
            </div>

            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
               <div className="p-4 border-b bg-muted/50 font-medium">
                 Expected vs Scanned Items
               </div>
               <div className="divide-y max-h-[500px] overflow-auto">
                 {expectedItems.map(item => {
                   const isScanned = scannedIds.has(item.id);
                   return (
                     <div key={item.id} className={`p-4 flex items-center justify-between ${isScanned ? 'bg-green-500/5 dark:bg-green-500/10' : ''}`}>
                       <div>
                         <p className="font-medium text-sm">{item.parts?.name}</p>
                         <p className="font-mono text-xs text-muted-foreground">QR: {item.qr_code}</p>
                       </div>
                       <div>
                         {isScanned ? (
                           <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                             <CheckCircle className="h-3 w-3 mr-1" /> Found
                           </Badge>
                         ) : (
                           <Badge variant="outline" className="text-muted-foreground border-dashed">
                             Pending Scan
                           </Badge>
                         )}
                       </div>
                     </div>
                   );
                 })}
                 {expectedItems.length === 0 && (
                   <div className="p-8 text-center text-muted-foreground">
                     No items currently listed as in-stock.
                   </div>
                 )}
               </div>
            </div>
            
          </div>

          <div className="col-span-1 space-y-6">
            <div className="p-6 bg-card border rounded-lg shadow-sm space-y-6 sticky top-24">
              <h2 className="text-lg font-semibold border-b pb-2">Audit Status</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Total Expected:</span>
                   <span className="font-bold text-lg">{expectedCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Scanned Found:</span>
                   <span className="font-bold text-lg text-green-600 dark:text-green-500">{scannedCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Unaccounted:</span>
                   <span className="font-bold text-lg text-red-600 dark:text-red-500">{expectedCount - scannedCount}</span>
                </div>

                <div className="pt-2">
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center mt-2 text-muted-foreground">{progress}% Complete</p>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                {expectedCount > 0 && scannedCount < expectedCount && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md flex gap-3 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p>Completing now will mark {expectedCount - scannedCount} items as permanently lost/stolen.</p>
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  disabled={isAuditing || expectedCount === 0}
                  onClick={completeAudit}
                >
                  {isAuditing ? "Finalizing..." : "Complete Audit"}
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
    </RoleProtectedRoute>
  );
}
