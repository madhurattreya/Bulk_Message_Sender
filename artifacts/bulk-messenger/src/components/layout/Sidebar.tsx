import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, FileText, Mail, MessageCircle, Send, CheckCircle2, XCircle } from "lucide-react";
import { useGetDashboardSummary } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: summary } = useGetDashboardSummary();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/templates", label: "Templates", icon: FileText },
    { 
      href: "/email", 
      label: "Email Setup", 
      icon: Mail,
      status: summary?.emailConfigured
    },
    { 
      href: "/whatsapp", 
      label: "WhatsApp", 
      icon: MessageCircle,
      status: summary?.whatsappConnected
    },
    { href: "/campaigns", label: "Campaigns", icon: Send },
  ];

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-[100dvh] sticky top-0">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Send className="w-5 h-5" />
          Bulk Messenger
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.status !== undefined && (
                <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-green-500' : 'bg-red-500'}`} />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
