import React, { useState, useEffect, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { Home, Star, Heart, ShoppingBag, X, LogOut, ShieldAlert, Moon, Sun, Calendar, AlertTriangle, Gamepad2, RotateCcw, ArrowUp } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io } from 'socket.io-client';

import { HomeSection } from './components/HomeSection';
import { AuthPage } from './components/AuthPage';
import { ChatWidget } from './components/ChatWidget';

// Lazy-load secțiunile secundare / grele pentru a reduce bundle-ul inițial
const FutureStarsSection = lazy(() =>
  import('./components/FutureStarsSection').then((m) => ({ default: m.FutureStarsSection }))
);
const UnsungHeroesSection = lazy(() =>
  import('./components/UnsungHeroesSection').then((m) => ({ default: m.UnsungHeroesSection }))
);
const CollectorsHubSection = lazy(() =>
  import('./components/CollectorsHubSection').then((m) => ({ default: m.CollectorsHubSection }))
);
const ProfileSection = lazy(() =>
  import('./components/ProfileSection').then((m) => ({ default: m.ProfileSection }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const MatchesSection = lazy(() =>
  import('./components/MatchesSection').then((m) => ({ default: m.MatchesSection }))
);
const GamesSection = lazy(() =>
  import('./components/GamesSection').then((m) => ({ default: m.GamesSection }))
);

// Încărcăm Devtools doar în development, fără erori de tipuri pe import.meta.env
const LazyReactQueryDevtools = (import.meta as any).env?.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      }))
    )
  : null;

const BACKEND_BASE = (import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// --- ERROR BOUNDARY GLOBAL ---
interface ErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Eroare prinsă de ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-[#11161D] border border-rose-500/25 rounded-xl text-center shadow-sm space-y-4">
          <div className="w-11 h-11 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Eroare temporară în secțiune
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              A apărut o problemă neașteptată aici. Restul platformei funcționează normal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reîncarcă secțiunea
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Button = ({ children, onClick, variant, className, disabled, title }: any) => {
  const baseStyle =
    "inline-flex items-center justify-center rounded-lg text-xs sm:text-[13px] font-medium transition-colors h-9 px-3.5 outline-none disabled:opacity-50 cursor-pointer";
  const variants: any = {
    default: "bg-emerald-600 hover:bg-emerald-500 text-white",
    ghost:
      "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.05]",
    secondary:
      "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/[0.08] hover:bg-slate-200/70 dark:hover:bg-white/[0.1]",
    destructive:
      "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseStyle} ${variants[variant || 'default']} ${className || ''}`}
    >
      {children}
    </button>
  );
};

const SectionLoader = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
      Se încarcă secțiunea...
    </span>
  </div>
);

type Section = 'home' | 'games' | 'stars' | 'heroes' | 'collectors' | 'matches' | 'profile' | 'admin';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role?: string;
    avatar?: string;
    hasAdminDeletedMessages?: boolean;
    _id?: string;
  } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [showWarning, setShowWarning] = useState(false);
  const [modalHideBars, setModalHideBars] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [activeChatRoom, setActiveChatRoom] = useState("general_chat");
  const [activeChatPartner, setActiveChatPartner] = useState<{ name: string; avatar?: string } | null>(null);

  const [sharedPostId, setSharedPostId] = useState<string | null>(null);
  const [updateRegistration, setUpdateRegistration] = useState<any>(null);

  const checkAdminWarnings = (userData: any) => {
    return userData;
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('footballAppUser');
    if (savedUser) {
      let localUser = JSON.parse(savedUser);
      localUser = checkAdminWarnings(localUser);
      setUser(localUser);
      localStorage.setItem('footballAppUser', JSON.stringify(localUser));
    }

    const savedTheme = localStorage.getItem('footballAppTheme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('postId');

    if (postId) {
      setSharedPostId(postId);
      setActiveSection('collectors');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setModalHideBars(false);
  }, [activeSection]);

  useEffect(() => {
    const handleToggleBars = (e: any) => {
      setModalHideBars(Boolean(e?.detail));
    };
    window.addEventListener('toggle-floating-bars', handleToggleBars);
    return () => window.removeEventListener('toggle-floating-bars', handleToggleBars);
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewportResize = () => {
      const heightRatio = vv.height / window.innerHeight;
      setKeyboardOpen(heightRatio < 0.78);
    };

    vv.addEventListener('resize', handleViewportResize);
    return () => vv.removeEventListener('resize', handleViewportResize);
  }, []);

  useEffect(() => {
    if (user && user.hasAdminDeletedMessages) {
      const aMaiVazutAvertismentul = localStorage.getItem(`warning_ack_${user.email}`);
      if (!aMaiVazutAvertismentul) {
        setShowWarning(true);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;
    const notifSocket = io(BACKEND_BASE, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    notifSocket.emit('register_user', user.email);

    notifSocket.on('new_private_message', (data: { from?: string; isListing?: boolean; listingTitle?: string }) => {
      toast(
        data.isListing
          ? `Ofertă nouă în Fanshop de la ${data.from || 'un coechipier'}`
          : `Mesaj nou de la ${data.from || 'un coechipier'}`
      );
    });

    return () => {
      notifSocket.disconnect();
    };
  }, [user?.email]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setUpdateRegistration(e.detail);
    };

    window.addEventListener('pwa-update-available', handleUpdate);

    let refreshing = false;
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  const handleDismissWarning = () => {
    setShowWarning(false);

    if (user?.email) {
      localStorage.setItem(`warning_ack_${user.email}`, 'true');
      const token = localStorage.getItem('footballAppToken');

      fetch(`${BACKEND_BASE}/api/users/clear-warning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: user.email }),
      }).catch((err) => console.error("Eroare la curățarea avertismentului din DB:", err));
    }

    const updatedUser = { ...user, hasAdminDeletedMessages: false } as typeof user;
    setUser(updatedUser);
    localStorage.setItem('footballAppUser', JSON.stringify(updatedUser));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('footballAppTheme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleLoginSuccess = (userData: any) => {
    const checkedData = checkAdminWarnings({ ...userData });
    setUser(checkedData);
    localStorage.setItem('footballAppUser', JSON.stringify(checkedData));
  };

  const handleLogout = () => {
    setUser(null);
    setActiveSection('home');
    localStorage.removeItem('footballAppUser');
    localStorage.removeItem('footballAppToken');
  };

  const handleOpenChat = (roomId: string, partner: { name: string; avatar?: string }) => {
    setActiveChatRoom(roomId);
    setActiveChatPartner(partner);
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'admin.nou@scout.ro';
  const hideFloatingBars = modalHideBars || keyboardOpen;

  const navigation = [
    { id: 'home' as Section, label: 'Teren', icon: Home },
    { id: 'matches' as Section, label: 'Meciuri', icon: Calendar },
    { id: 'games' as Section, label: 'Jocuri', icon: Gamepad2 },
    { id: 'stars' as Section, label: 'Tineri', icon: Star },
    { id: 'heroes' as Section, label: 'Legende', icon: Heart },
    { id: 'collectors' as Section, label: 'Fanshop', icon: ShoppingBag },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return <HomeSection user={user!} onNavigate={setActiveSection} />;
      case 'matches':
        return <MatchesSection userEmail={user?.email} />;
      case 'games':
        return <GamesSection user={user!} />;
      case 'stars':
        return <FutureStarsSection />;
      case 'heroes':
        return <UnsungHeroesSection />;
      case 'collectors':
        return (
          <CollectorsHubSection
            user={user!}
            onOpenChat={handleOpenChat}
            initialPostId={sharedPostId}
          />
        );
      case 'profile':
        return (
          <ProfileSection
            user={user!}
            onUpdateUser={handleLoginSuccess}
            onLogout={handleLogout}
          />
        );
      case 'admin':
        return isAdmin ? (
          <AdminDashboard user={user!} />
        ) : (
          <HomeSection user={user!} onNavigate={setActiveSection} />
        );
      default:
        return <HomeSection user={user!} onNavigate={setActiveSection} />;
    }
  };

  const toastOptions = {
    style: {
      background: '#11161D',
      color: '#F1F5F9',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '10px',
      fontWeight: '500',
      fontSize: '13px',
      marginBottom: '72px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
      zIndex: 9999999,
    },
  };

  if (!user) {
    return (
      <>
        <Toaster position="bottom-center" toastOptions={toastOptions} />
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F14] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 relative overflow-x-hidden">
        <Toaster position="bottom-center" toastOptions={toastOptions} />

        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0B0F14]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.07]">
          {/* Accent tricolor discret de 2px */}
          <div className="h-[2px] w-full flex opacity-85">
            <div className="flex-1 bg-blue-600" />
            <div className="flex-1 bg-amber-400" />
            <div className="flex-1 bg-rose-600" />
          </div>

          <div className="max-w-6xl mx-auto px-4">
            <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
              {/* Brand */}
              <div
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                onClick={() => setActiveSection('home')}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white/[0.06] border border-slate-800 dark:border-white/[0.1] group-hover:border-emerald-500/60 transition-colors">
                  <span className="text-xs font-bold text-white tracking-tight">RO</span>
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-sm font-semibold leading-tight text-slate-900 dark:text-white tracking-tight">
                    România Scout
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Scouting & Live Data
                  </span>
                </div>
              </div>

              {/* Navigație Desktop */}
              <nav className="hidden lg:flex items-center gap-1">
                {navigation.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white dark:bg-white/[0.08] dark:text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'opacity-75'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Acțiuni dreapta */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title={theme === 'light' ? 'Mod Întunecat' : 'Mod Luminos'}
                >
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>

                {/* Mobil: Profil */}
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className={`sm:hidden flex items-center gap-2 h-9 px-2.5 rounded-lg border transition-colors cursor-pointer ${
                    activeSection === 'profile'
                      ? 'bg-slate-900 border-slate-800 text-white dark:bg-white/[0.1] dark:border-white/[0.15]'
                      : 'bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200'
                  }`}
                  title="Profil"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 overflow-hidden shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <span className="text-xs font-medium max-w-[70px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                {/* Desktop: Admin, Profil, Logout */}
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/[0.08]">
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      onClick={() => setActiveSection('admin')}
                      className={activeSection === 'admin' ? 'bg-rose-500/20' : ''}
                    >
                      <ShieldAlert className="h-3.5 w-3.5 mr-1.5" /> Admin
                    </Button>
                  )}
                  <Button
                    variant={activeSection === 'profile' ? 'secondary' : 'ghost'}
                    onClick={() => setActiveSection('profile')}
                    className="gap-2 border border-slate-200 dark:border-white/[0.08]"
                  >
                    <div className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 overflow-hidden shrink-0">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
                  </Button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-500 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                    title="Deconectare"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 pb-24 lg:pb-10 relative z-10">
          <ErrorBoundary resetKey={activeSection}>
            <Suspense fallback={<SectionLoader />}>
              {renderSection()}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* BARA DE NAVIGARE JOS PENTRU MOBIL */}
        {!hideFloatingBars && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B0F14]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/[0.07] px-1 py-1.5 flex justify-around items-center">
            {navigation.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-colors ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`w-4 h-4 mb-0.5 shrink-0 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                  <span className="text-[10px] font-medium truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {showWarning && (
          <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-[#11161D] border border-rose-500/30 rounded-xl p-4 shadow-xl z-[9999] w-[92%] max-w-md flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-rose-600 dark:text-rose-400 text-xs font-semibold mb-1">
                Avertisment moderare
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Un mesaj scris de tine a fost eliminat de administratori pentru nerespectarea regulamentului.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismissWarning}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {user && !hideFloatingBars && (
          <ChatWidget
            key={activeChatRoom}
            user={user}
            roomID={activeChatRoom}
            chatPartner={activeChatPartner}
          />
        )}

        {updateRegistration && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.08] rounded-xl p-6 shadow-2xl w-full max-w-sm text-center flex flex-col items-center">
              <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-center justify-center mb-4">
                <ArrowUp className="w-5 h-5 text-emerald-500" />
              </div>

              <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1.5">
                Actualizare disponibilă
              </h3>

              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6">
                Există o versiune nouă a platformei. Instalează actualizarea pentru a continua.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (updateRegistration?.waiting) {
                    updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                }}
                className="w-full py-2.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
              >
                Instalează acum
              </button>
            </div>
          </div>
        )}
      </div>

      {LazyReactQueryDevtools && (
        <Suspense fallback={null}>
          <LazyReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}