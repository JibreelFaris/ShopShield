import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Wrench, Package, ShieldCheck, History } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useEffect } from 'react';
import { getRole } from '../../lib/auth';

type UserRole = 'owner' | 'employee';

type NavItem = {
  icon: any;
  label: string;
  href: string;
  end?: boolean;
};

export function Sidebar() {
  const [userRole, setUserRole] = useState<UserRole>('employee');

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const role = await getRole();
        setUserRole(role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('employee'); // Default to employee on error
      }
    };

    fetchRole();
  }, []);

  // Base navigation items available to all users
  const baseNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: ShoppingCart, label: 'Quick Sale', href: '/sales', end: true },
    { icon: Wrench, label: 'Jobs & Repairs', href: '/jobs' },
    { icon: Package, label: 'Inventory', href: '/inventory', end: true },
  ];

  // Admin-only navigation items
  const adminNavItems: NavItem[] = [
    { icon: History, label: 'Sales History', href: '/sales/history' },
    { icon: ShieldCheck, label: 'Audit & Theft', href: '/inventory/audit' },
  ];

  // Combine navigation items based on user role
  const navItems = userRole === 'owner' 
    ? [...baseNavItems, ...adminNavItems]
    : baseNavItems;
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <ShieldCheck className="h-6 w-6" />
          ShopShield
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end === true}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50",
                isActive ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
