import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRole } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'owner' | 'employee';
  fallbackPath?: string;
}

export function RoleProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/dashboard' 
}: RoleProtectedRouteProps) {
  const [userRole, setUserRole] = useState<'owner' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRole = async () => {
      try {
        const role = await getRole();
        setUserRole(role);
        
        if (role !== requiredRole) {
          navigate(fallbackPath);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [requiredRole, fallbackPath, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <ShieldX className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-600 dark:text-red-400">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page. This feature requires {requiredRole} privileges.
            </p>
            <button
              onClick={() => navigate(fallbackPath)}
              className="text-primary hover:underline"
            >
              Go back to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
