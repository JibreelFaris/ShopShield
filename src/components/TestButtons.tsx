import { Button } from "./ui/button";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useState } from "react";

export function TestButtons() {
  const [dbStatus, setDbStatus] = useState("");

  const testShadcn = () => {
    toast.success("✅ shadcn/ui is working!");
  };

  const testSupabase = async () => {
    try {
      const { error } = await supabase
        .from("organizations")
        .select("count")
        .limit(1);

      if (error) throw error;
      setDbStatus("✅ Connected to Supabase!");
      toast.success("Supabase connection successful");
    } catch (error) {
      setDbStatus("❌ Connection failed");
      toast.error("Supabase connection failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 justify-center">
        <Button
          onClick={testShadcn}
          className="bg-green-600 hover:bg-green-700"
        >
          Test shadcn
        </Button>
        <Button onClick={testSupabase} variant="outline">
          Test Supabase
        </Button>
      </div>
      {dbStatus && (
        <div className="p-3 bg-slate-100 rounded-md text-sm">{dbStatus}</div>
      )}
    </div>
  );
}
