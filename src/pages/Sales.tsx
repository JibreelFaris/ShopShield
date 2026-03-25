import { useState, useEffect } from "react";
import {
  Smartphone,
  ShoppingBag,
  CreditCard,
  Banknote,
  Building,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getOrgId, getUserId } from "@/lib/auth";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Shop = {
  id: string;
  name: string;
  location: string | null;
};

/* ─── Predefined catalogs ─── */

const RETAIL_ITEMS = [
  { name: "Phone Case", price: 30 },
  { name: "Screen Protector", price: 20 },
  { name: "Charger", price: 50 },
  { name: "Cable", price: 25 },
  { name: "Earphones", price: 35 },
  { name: "Power Bank", price: 80 },
];

const REPAIR_SERVICES = [
  { name: "Screen Replacement", price: 250 },
  { name: "Battery Replacement", price: 150 },
  { name: "Charging Port Repair", price: 180 },
  { name: "Water Damage Diagnosis", price: 100 },
  { name: "Back Glass Repair", price: 200 },
  { name: "Speaker / Mic Fix", price: 120 },
];

type SaleType = "repair" | "retail";
type PaymentMethod = "cash" | "card" | "transfer";

export function Sales() {
  const [saleType, setSaleType] = useState<SaleType>("retail");
  const [itemName, setItemName] = useState("");
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>("");

  // Fetch shops on component mount
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const orgId = await getOrgId();
        const { data: shopsData, error } = await supabase
          .from('shops')
          .select('*')
          .eq('org_id', orgId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        setShops(shopsData || []);
        // Auto-select first shop if none selected
        if (shopsData && shopsData.length > 0 && !selectedShopId) {
          setSelectedShopId(shopsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching shops:', error);
        toast.error('Failed to load shops');
      }
    };

    fetchShops();
  }, [selectedShopId]);

  /* helpers */
  const selectRetailItem = (name: string, price: number) => {
    setItemName(name);
    setDefaultPrice(price);
    setFinalPrice(price.toString());
  };

  const selectRepairService = (value: string) => {
    const svc = REPAIR_SERVICES.find((s) => s.name === value);
    if (svc) {
      setItemName(svc.name);
      setDefaultPrice(svc.price);
      setFinalPrice(svc.price.toString());
    }
  };

  const switchTab = (type: SaleType) => {
    setSaleType(type);
    setItemName("");
    setDefaultPrice(0);
    setFinalPrice("");
  };

  const numFinal = parseFloat(finalPrice) || 0;
  const isHeavyDiscount = defaultPrice > 0 && numFinal < defaultPrice * 0.6;

  const handleRecordSale = async () => {
    if (!itemName) {
      toast.error("Please select an item or service.");
      return;
    }
    if (!finalPrice || numFinal < 0) {
      toast.error("Please enter a valid final price.");
      return;
    }
    if (!selectedShopId) {
      toast.error("Please select a shop.");
      return;
    }

    setSubmitting(true);
    try {
      const orgId = await getOrgId();
      const userId = await getUserId();

      const discount = Math.max(0, defaultPrice - numFinal);

      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          org_id: orgId,
          shop_id: selectedShopId,
          created_by: userId,
          sale_type: saleType,
          item_name: itemName,
          default_price: defaultPrice,
          final_price: numFinal,
          discount_amount: discount,
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      await supabase.from("activity_logs").insert({
        org_id: orgId,
        user_id: userId,
        action: "recorded_sale",
        entity_type: "sale",
        entity_id: saleData.id,
        details: {
          sale_type: saleType,
          item: itemName,
          amount: numFinal,
          discount,
        },
      });

      toast.success("Sale Recorded!", {
        description: `${itemName} — AED ${numFinal} (${paymentMethod})`,
      });

      setItemName("");
      setDefaultPrice(0);
      setFinalPrice("");
      setPaymentMethod("cash");
    } catch (err) {
      const msg = (err as Error)?.message || JSON.stringify(err);
      console.error("Error logging sale:", err);
      toast.error("Failed to record sale", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── UI ─── */
  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto space-y-5 pb-16">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quick Sale</h1>
          <p className="text-sm text-muted-foreground">
            Record a transaction in seconds.
          </p>
        </div>

        {/* Shop Selector */}
        {shops.length > 0 && (
          <Card>
            <CardContent className="pt-5">
              <Label className="text-sm font-semibold">Shop Location</Label>
              <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select a shop..." />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                      {shop.location && ` - ${shop.location}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Sale Type Toggle ── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => switchTab("retail")}
            className={cn(
              "h-14 text-base gap-2 transition-all",
              saleType === "retail" &&
                "border-primary bg-primary/10 ring-2 ring-primary font-semibold"
            )}
          >
            <ShoppingBag className="h-5 w-5" />
            Retail
          </Button>
          <Button
            variant="outline"
            onClick={() => switchTab("repair")}
            className={cn(
              "h-14 text-base gap-2 transition-all",
              saleType === "repair" &&
                "border-primary bg-primary/10 ring-2 ring-primary font-semibold"
            )}
          >
            <Smartphone className="h-5 w-5" />
            Repair
          </Button>
        </div>

        {/* ── Step 2: Item Selection ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {saleType === "retail" ? "Select Accessory" : "Select Service"}
            </CardTitle>
            <CardDescription>
              {saleType === "retail"
                ? "Tap an item to auto-fill price."
                : "Choose a repair service from the list."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saleType === "retail" ? (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {RETAIL_ITEMS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectRetailItem(item.name, item.price)}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border p-3 sm:p-4 text-center transition-all hover:border-primary/50 hover:bg-muted/50 cursor-pointer",
                      itemName === item.name &&
                        "border-primary bg-primary/5 ring-2 ring-primary"
                    )}
                  >
                    <span className="text-xs sm:text-sm font-semibold leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                      {item.price} AED
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Select value={itemName} onValueChange={selectRepairService}>
                <SelectTrigger className="w-full h-12 text-sm sm:text-base">
                  <SelectValue placeholder="Select a service..." />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="z-50">
                  {REPAIR_SERVICES.map((svc) => (
                    <SelectItem key={svc.name} value={svc.name} className="py-3 cursor-pointer">
                      {svc.name} — {svc.price} AED
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* ── Step 3 + 4: Price & Payment (shown only after item is picked) ── */}
        {itemName && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Price */}
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="final-price" className="text-sm font-semibold">
                    Final Price
                  </Label>
                  {defaultPrice > 0 && numFinal !== defaultPrice && (
                    <span className="text-xs text-muted-foreground">
                      Default: {defaultPrice} AED
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    AED
                  </span>
                  <Input
                    id="final-price"
                    type="number"
                    inputMode="decimal"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    className="pl-12 h-14 text-2xl font-bold"
                    placeholder="0"
                  />
                </div>

                {isHeavyDiscount && (
                  <div className="flex gap-2 items-start p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Warning:</strong> This price is significantly lower
                      than the normal service price.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardContent className="pt-5 space-y-3">
                <Label className="text-sm font-semibold">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "cash" as const, icon: Banknote, label: "Cash" },
                    { key: "card" as const, icon: CreditCard, label: "Card" },
                    { key: "transfer" as const, icon: Building, label: "Transfer" },
                  ].map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPaymentMethod(key)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 sm:p-4 transition-all cursor-pointer hover:border-primary/50",
                        paymentMethod === key &&
                          "border-primary bg-primary/5 ring-2 ring-primary"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Record Button */}
            <Button
              className="w-full h-14 text-lg font-bold gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              onClick={handleRecordSale}
              disabled={submitting}
            >
              <CheckCircle2 className="h-5 w-5" />
              {submitting ? "Recording..." : "Record Sale"}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}