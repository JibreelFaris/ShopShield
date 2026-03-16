import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Layout } from "@/components/layout/Layout";
import { Button } from "../components/ui/button";
import { Plus, Search, AlertTriangle, QrCode } from "lucide-react";
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
import { Link } from "react-router-dom";

type Part = Database['public']['Tables']['parts']['Row'];

interface PartWithStock extends Part {
  in_stock_count: number;
}

export function Inventory() {
  const [parts, setParts] = useState<PartWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      // Fetch metadata catalog
      const { data: partsData, error: partsError } = await supabase
        .from("parts")
        .select("*")
        .order("name", { ascending: true });

      if (partsError) throw partsError;

      // Fetch all physical items to calculate stock
      const { data: itemsData, error: itemsError } = await supabase
        .from("inventory_items")
        .select("part_id, status");

      if (itemsError) throw itemsError;

      // Group items to calculate in_stock_count per part_id
      const stockCounts = (itemsData || []).reduce((acc: Record<string, number>, item) => {
        if (item.status === 'in_stock') {
          acc[item.part_id] = (acc[item.part_id] || 0) + 1;
        }
        return acc;
      }, {});

      const combined: PartWithStock[] = (partsData || []).map(part => ({
        ...part,
        in_stock_count: stockCounts[part.id] || 0
      }));

      setParts(combined);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = parts.filter(part => 
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (part.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Parts Inventory</h1>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/inventory/audit">
                <QrCode className="mr-2 h-4 w-4" /> Start Audit
              </Link>
            </Button>
            <Button asChild>
              <Link to="/inventory/new">
                <Plus className="mr-2 h-4 w-4" /> Add Part
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search parts by name or category..."
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
                <TableHead>Part Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price (Buy / Sell)</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading inventory...
                  </TableCell>
                </TableRow>
              ) : filteredParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No parts found in the catalog.
                  </TableCell>
                </TableRow>
              ) : (
                filteredParts.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">
                      {part.name}
                      <div className="text-xs text-muted-foreground font-mono">
                        {part.id.split('-')[0]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.category || 'Uncategorized'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground line-through mr-2">AED {part.purchase_price}</span>
                        <span className="font-semibold text-green-600 dark:text-green-500">AED {part.selling_price}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{part.in_stock_count}</span>
                        <span className="text-sm text-muted-foreground">units</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {part.in_stock_count <= (part.min_stock_level || 0) ? (
                        <Badge variant="destructive" className="flex items-center gap-1 ml-auto w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                          In Stock
                        </Badge>
                      )}
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
