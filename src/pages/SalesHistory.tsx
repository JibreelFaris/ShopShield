import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOrgId } from "@/lib/auth";
import { Layout } from "@/components/layout/Layout";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Banknote,
  CreditCard,
  Building,
  ShoppingBag,
  Smartphone,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Sale {
  id: string;
  sale_type: "repair" | "retail";
  item_name: string;
  default_price: number;
  final_price: number;
  discount_amount: number;
  payment_method: "cash" | "card" | "transfer";
  created_at: string;
  created_by: string | null;
  shop_id: string | null;
}

const paymentIcons: Record<string, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  transfer: Building,
};

export function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const orgId = await getOrgId();
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales((data as Sale[]) || []);
    } catch (error: any) {
      console.error("Error fetching sales:", error);
      toast.error("Failed to load sales", {
        description: error?.message || "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredSales = sales.filter((sale) => {
    // Text search
    if (
      searchQuery &&
      !sale.item_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    // Type filter
    if (typeFilter !== "all" && sale.sale_type !== typeFilter) return false;

    // Payment filter
    if (paymentFilter !== "all" && sale.payment_method !== paymentFilter)
      return false;

    // Date filter
    if (dateFilter !== "all") {
      const saleDate = new Date(sale.created_at);
      if (dateFilter === "today" && saleDate < startOfToday) return false;
      if (dateFilter === "week" && saleDate < startOfWeek) return false;
      if (dateFilter === "month" && saleDate < startOfMonth) return false;
    }

    return true;
  });

  // Stats from filtered sales
  const totalRevenue = filteredSales.reduce((s, sale) => s + sale.final_price, 0);
  const totalDiscount = filteredSales.reduce(
    (s, sale) => s + sale.discount_amount,
    0
  );
  const avgSale =
    filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  const heavyDiscountCount = filteredSales.filter(
    (s) => s.default_price > 0 && s.final_price < s.default_price * 0.6
  ).length;

  return (
    <RoleProtectedRoute requiredRole="owner">
      <Layout>
        <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/sales">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Sales History
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredSales.length} transaction{filteredSales.length !== 1 && "s"}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/sales">+ New Sale</Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {totalRevenue.toFixed(0)} <span className="text-sm font-normal">AED</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Discounts Given</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {totalDiscount.toFixed(0)} <span className="text-sm font-normal">AED</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">Avg. Sale</p>
              <p className="text-xl sm:text-2xl font-bold">
                {avgSale.toFixed(0)} <span className="text-sm font-normal">AED</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground mb-1">
                Heavy Discounts
              </p>
              <p
                className={cn(
                  "text-xl sm:text-2xl font-bold",
                  heavyDiscountCount > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                {heavyDiscountCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by item name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="retail">Retail</SelectItem>
              <SelectItem value="repair">Repair</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="hidden sm:table-cell text-right">
                  Discount
                </TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    Loading sales...
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    {sales.length === 0
                      ? "No sales recorded yet. Go record your first sale!"
                      : "No sales match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => {
                  const PayIcon = paymentIcons[sale.payment_method] || Banknote;
                  const isHighDiscount =
                    sale.default_price > 0 &&
                    sale.final_price < sale.default_price * 0.6;

                  return (
                    <TableRow key={sale.id} className={cn(isHighDiscount && "bg-yellow-500/5")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sale.sale_type === "retail" ? (
                            <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                          ) : (
                            <Smartphone className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                          )}
                          <div>
                            <p className="font-medium text-sm leading-tight">
                              {sale.item_name}
                            </p>
                            {/* Mobile-only type + payment info */}
                            <div className="flex items-center gap-2 sm:hidden mt-0.5">
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {sale.sale_type}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground capitalize">
                                {sale.payment_method}
                              </span>
                            </div>
                          </div>
                          {isHighDiscount && (
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={
                            sale.sale_type === "retail" ? "secondary" : "outline"
                          }
                          className="text-xs"
                        >
                          {sale.sale_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-sm">
                          {sale.final_price} AED
                        </span>
                        {sale.final_price !== sale.default_price &&
                          sale.default_price > 0 && (
                            <div className="text-[10px] text-muted-foreground line-through">
                              {sale.default_price} AED
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right">
                        {sale.discount_amount > 0 ? (
                          <span className="text-orange-600 dark:text-orange-400 text-sm font-medium">
                            -{sale.discount_amount} AED
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 capitalize text-sm">
                          <PayIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {sale.payment_method}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(sale.created_at), "dd MMM")}
                        <div className="text-[10px]">
                          {format(new Date(sale.created_at), "HH:mm")}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Layout>
    </RoleProtectedRoute>
  );
}
