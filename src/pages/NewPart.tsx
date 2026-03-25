import { useState } from "react";
import { supabase } from "../lib/supabase";
import { getOrgId } from "../lib/auth";
import { Layout } from "@/components/layout/Layout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Hash } from "lucide-react";
import { Link } from "react-router-dom";

export function NewPart() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    purchase_price: "",
    selling_price: "",
    min_stock_level: "5",
    quantity_to_add: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const orgId = await getOrgId();

      // 1. Create the Part Catalog Entry
      const { data: partData, error: partError } = await supabase.from("parts").insert({
        org_id: orgId,
        name: formData.name,
        category: formData.category,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 0,
      }).select().single();

      if (partError) throw partError;

      // 2. Generate X Physical Inventory Items
      const quantity = parseInt(formData.quantity_to_add) || 1;
      const inventoryItemsToInsert = Array.from({ length: quantity }).map(() => ({
        org_id: orgId,
        part_id: partData.id,
        status: 'in_stock' as const,
        qr_code: `QR-${Math.random().toString(36).substring(2, 10).toUpperCase()}` // Mock unique QR string
      }));

      const { error: itemsError } = await supabase
        .from("inventory_items")
        .insert(inventoryItemsToInsert);

      if (itemsError) throw itemsError;

      // 3. Log Activity
      await supabase.from("activity_logs").insert({
        org_id: orgId,
        user_id: userData.user.id,
        action: "created",
        entity_type: "part",
        entity_id: partData.id,
        details: { message: `Added ${quantity} units of ${formData.name} to inventory` }
      });

      toast.success(`Successfully added ${quantity} units!`);
      navigate('/inventory');
    } catch (err) {
      console.error("Error creating parts:", err);
      toast.error((err as Error).message || "Failed to add inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/inventory">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Add New Part</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 border rounded-lg shadow-sm">
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Catalog Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Part Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g. iPhone 13 Pro Max Screen"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="Screens, Batteries, Flex Cables..."
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase_price">Vendor Cost (AED) *</Label>
                <Input
                  id="purchase_price"
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.purchase_price}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price (AED) *</Label>
                <Input
                  id="selling_price"
                  name="selling_price"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formData.selling_price}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Stock Control</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="min_stock_level">Low Stock Alert Level</Label>
                <Input
                  id="min_stock_level"
                  name="min_stock_level"
                  type="number"
                  placeholder="e.g. 5"
                  value={formData.min_stock_level}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">Alerts you when stock falls below this number.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity_to_add" className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Initial Quantity to Add
                </Label>
                <Input
                  id="quantity_to_add"
                  name="quantity_to_add"
                  type="number"
                  min="1"
                  required
                  value={formData.quantity_to_add}
                  onChange={handleChange}
                />
                 <p className="text-xs text-muted-foreground">This generates unique QR codes for each physical item.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/inventory')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : <><Plus className="mr-2 h-4 w-4" /> Add Part to Inventory</>}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
