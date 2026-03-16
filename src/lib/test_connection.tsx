import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export function TestConnection() {
  const [status, setStatus] = useState("Testing connection...");

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to fetch organizations (this should work if RLS is disabled)
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .limit(1);

        if (error) throw error;

        setStatus("✅ Connected to Supabase successfully!");
        console.log("Data:", data);
      } catch (error) {
        setStatus(
          "❌ Connection failed: " +
            (error instanceof Error ? error.message : String(error)),
        );
        console.error("Error:", error);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="p-4 bg-slate-100 rounded-lg">
      <p>{status}</p>
    </div>
  );
}
