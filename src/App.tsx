import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { LoginView } from './views/LoginView.tsx';
import { Sidebar, NavItem } from './components/layout/Sidebar.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Footer } from './components/layout/Footer.tsx';

// Views
import { DashboardView } from './views/DashboardView.tsx';
import { PosView } from './views/PosView.tsx';
import { SalesHistoryView } from './views/SalesHistoryView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { MastersView } from './views/MastersView.tsx';
import { InventoryView } from './views/InventoryView.tsx';
import { StockOpnameView } from './views/StockOpnameView.tsx';
import { PurchasesView } from './views/PurchasesView.tsx';
import { SuppliersView } from './views/SuppliersView.tsx';
import { CustomersView } from './views/CustomersView.tsx';
import { PayablesView } from './views/PayablesView.tsx';
import { ReceivablesView } from './views/ReceivablesView.tsx';
import { CashBookView } from './views/CashBookView.tsx';
import { ShiftsView } from './views/ShiftsView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { UsersView } from './views/UsersView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

const VALID_TABS: NavItem[] = [
  'dashboard',
  'pos',
  'sales',
  'products',
  'masters',
  'inventory',
  'stock-opname',
  'purchases',
  'suppliers',
  'customers',
  'payables',
  'receivables',
  'cash',
  'shifts',
  'reports',
  'users',
  'audit',
  'settings',
];

const getInitialTab = (): NavItem => {
  try {
    const hash = window.location.hash.replace('#', '').trim() as NavItem;
    if (VALID_TABS.includes(hash)) return hash;
    const stored = localStorage.getItem('kasirpro_active_tab') as NavItem;
    if (VALID_TABS.includes(stored)) return stored;
  } catch {
    // fallback
  }
  return 'dashboard';
};

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTabState] = useState<NavItem>(getInitialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kasirpro_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Sync activeTab to localStorage and window.location.hash
  const setActiveTab = (tab: NavItem) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('kasirpro_active_tab', tab);
      if (window.location.hash.replace('#', '') !== tab) {
        window.location.hash = tab;
      }
    } catch {
      // ignore
    }
  };

  // Sync active tab to URL hash on initial load
  React.useEffect(() => {
    try {
      const currentHash = window.location.hash.replace('#', '').trim();
      if (!currentHash && activeTab) {
        window.location.hash = activeTab;
      }
    } catch {
      // ignore
    }
  }, [activeTab]);

  // Listen to browser hash changes (back/forward navigation)
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim() as NavItem;
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        localStorage.setItem('kasirpro_active_tab', hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('kasirpro_sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-mandiri-navy to-mandiri-navy-light border border-mandiri-gold/40 flex items-center justify-center font-black text-2xl text-mandiri-gold shadow-xl animate-pulse">
          K
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Memuat Sistem KASIRPRO...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pos':
        return <PosView />;
      case 'sales':
        return <SalesHistoryView />;
      case 'products':
        return <ProductsView />;
      case 'masters':
        return <MastersView />;
      case 'inventory':
        return <InventoryView />;
      case 'stock-opname':
        return <StockOpnameView />;
      case 'purchases':
        return <PurchasesView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'customers':
        return <CustomersView />;
      case 'payables':
        return <PayablesView />;
      case 'receivables':
        return <ReceivablesView />;
      case 'cash':
        return <CashBookView />;
      case 'shifts':
        return <ShiftsView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'audit':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-slate-100 font-sans text-slate-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            {renderActiveView()}
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ToastProvider>
  );
}
