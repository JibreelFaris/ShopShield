import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

type Mode = "login" | "signup";

export function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Use the user's own ID as the org_id on first registration.
        // This makes the app work immediately without a separate org-setup step.
        // org_id is set in the trigger below — see note.
        data: {
          // We temporarily set org_id to a placeholder; the real UUID gets
          // set by a DB trigger after the user is created. Until then,
          // getOrgId() falls back to user.id automatically.
          org_id: null,
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else if (data.user) {
      // Update metadata with actual user ID as org_id for MVP single-tenant setup
      await supabase.auth.updateUser({
        data: { org_id: data.user.id },
      });
      toast.success("Account created! You can now log in.", {
        description: "Check your email to confirm your address if required.",
      });
      setMode("login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">ShopShield</h1>
          <p className="text-sm text-muted-foreground">
            Multi-shop repair management system
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{mode === "login" ? "Welcome back" : "Create account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your ShopShield account"
                : "Set up your shop management account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@shopshield.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? mode === "login" ? "Signing in..." : "Creating account..."
                  : mode === "login" ? "Sign In" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary underline underline-offset-4 hover:no-underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
