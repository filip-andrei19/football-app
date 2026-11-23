import React, { useState, useEffect, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { Home, Star, Heart, ShoppingBag, X, LogOut, ShieldAlert, Moon, Sun, Calendar, AlertTriangle, Gamepad2, RotateCcw } from 'lucide-react';
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
      staleTime: 1000 * 60 * 2, // 2 minute fără re-fetch inutil
      gcTime: 1000 * 60 * 10, // păstrează în memorie 10 minute
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
        <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 bg-slate-900 border-4 border-rose-600/50 rounded-3xl text-center shadow-2xl space-y-4">
          <AlertTriangle className="w-14 h-14 text-rose-500 mx-auto" />
          <h3 className="text-xl font-black uppercase tracking-widest text-white">
            Fază întreruptă de VAR
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-bold">
            A apărut o eroare neașteptată în această secțiune. Restul platformei funcționează normal.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs border-b-4 border-emerald-800 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Reîncarcă Secțiunea
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const Button = ({ children, onClick, variant, className, disabled, title }: any) => {
  const baseStyle =
    "inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-200 h-10 sm:h-12 px-4 sm:px-5 outline-none disabled:opacity-50 border-b-4 hover:border-b-2 hover:translate-y-[2px] shadow-sm";
  const variants: any = {
    default: "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-800",
    ghost:
      "border-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:border-b-4 hover:translate-y-0",
    secondary:
      "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800",
    destructive: "bg-rose-600 hover:bg-rose-500 text-white border-rose-800",
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
    <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
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
          ? `Ofertă nouă în Fanshop de la ${data.from || 'un coechipier'}!`
          : `Mesaj nou de la ${data.from || 'un coechipier'}`,
        { icon: '💬' }
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

  if (!user) {
    return (
      <>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#020617',
              color: '#fff',
              border: '2px solid #10b981',
              borderRadius: '16px',
              fontWeight: '900',
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '1px',
              marginBottom: '80px',
            },
          }}
        />
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-emerald-50 flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_40px,#000_40px,#000_42px)]" />

        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#020617',
              color: '#fff',
              border: '2px solid #10b981',
              borderRadius: '16px',
              fontWeight: '900',
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '1px',
              marginBottom: '80px',
              zIndex: 9999999,
            },
          }}
        />

        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors duration-300 shadow-lg border-b-4 border-slate-200 dark:border-slate-800">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600 flex">
            <div className="flex-1 bg-blue-600" />
            <div className="flex-1 bg-yellow-400" />
            <div className="flex-1 bg-red-600" />
          </div>

          <div className="container mx-auto px-4">
            <div className="flex h-20 items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer select-none group"
                onClick={() => setActiveSection('home')}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border-2 border-slate-800 shadow-[0_4px_15px_rgba(0,0,0,0.2)] transform group-hover:scale-105 transition-transform group-hover:border-emerald-500">
                  <span className="text-xl font-black text-white tracking-tighter">RO</span>
                </div>
                <div className="hidden lg:block">
                  <h1 className="text-xl font-black leading-none uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Scout
                    <br />
                    <span className="text-slate-400 text-xs tracking-widest">România</span>
                  </h1>
                </div>
              </div>

              <nav className="hidden lg:flex items-center gap-2">
                {navigation.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] xl:text-xs font-black uppercase tracking-widest transition-all duration-200 border-b-4 ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-800 shadow-md translate-y-[-2px]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="p-2.5 sm:p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-colors"
                  title={theme === 'light' ? 'Mod Întunecat' : 'Mod Luminos'}
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </button>

                {/* Pe telefon: doar butonul de Profil lângă tema dark/light */}
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className={`sm:hidden flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-colors ${
                    activeSection === 'profile'
                      ? 'bg-emerald-600 border-emerald-700 text-white'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500'
                  }`}
                  title="Profil"
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-black text-emerald-600 dark:text-emerald-400 overflow-hidden border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider max-w-[70px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                {/* Pe desktop: butoanele complete */}
                <div className="hidden sm:flex items-center gap-3 ml-2 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      onClick={() => setActiveSection('admin')}
                      className={`border-b-4 border-rose-800 !px-4 ${activeSection === 'admin' ? 'bg-rose-700' : ''}`}
                    >
                      <ShieldAlert className="h-4 w-4 mr-2" /> Panou
                    </Button>
                  )}
                  <Button
                    variant={activeSection === 'profile' ? 'secondary' : 'ghost'}
                    onClick={() => setActiveSection('profile')}
                    className="gap-3 !px-4 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500"
                  >
                    <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-black text-emerald-600 dark:text-emerald-400 overflow-hidden border border-emerald-200 dark:border-emerald-800">
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                    className="!px-3 border-b-4 border-rose-800 hover:bg-rose-600 bg-slate-100 dark:bg-slate-900 text-rose-500 dark:text-rose-500 border-slate-200 dark:border-slate-800"
                    title="Părăsește Terenul"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8 relative z-10">
          <ErrorBoundary resetKey={activeSection}>
            <Suspense fallback={<SectionLoader />}>
              {renderSection()}
            </Suspense>
          </ErrorBoundary>
        </main>

        {/* BARA DE NAVIGARE JOS PENTRU MOBIL - TOATE CELE 6 PAGINI PRINCIPALE */}
        {!hideFloatingBars && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t-2 border-slate-200 dark:border-slate-800 px-1 py-1.5 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
            {navigation.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 scale-105'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-0.5 shrink-0 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  <span className="text-[8px] font-black uppercase tracking-tight truncate max-w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {showWarning && (
          <div className="fixed bottom-24 sm:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border-4 border-rose-600 rounded-3xl p-5 shadow-[0_20px_50px_rgba(225,29,72,0.5)] z-[9999] w-[92%] max-w-md flex items-start gap-4 animate-in slide-in-from-bottom-5">
            <div className="w-8 h-12 rounded bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)] flex items-center justify-center shrink-0 border-2 border-white self-center -rotate-12">
              <span className="text-xl font-black text-white leading-none">!</span>
            </div>

            <div className="flex-1">
              <h4 className="text-rose-500 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Decizie VAR (Comisie)
              </h4>
              <p className="text-white text-xs sm:text-sm font-bold leading-snug">
                Comisia Centrală a eliminat un mesaj scris de tine (Limbaj neadecvat / Fault dur). Ai primit un avertisment la dosar!
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismissWarning}
              className="text-slate-400 hover:text-white hover:bg-rose-600 p-2 bg-slate-800 border-2 border-slate-700 hover:border-rose-500 rounded-xl transition-all shrink-0"
            >
              <X className="w-5 h-5 font-bold" />
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-in fade-in duration-500">
            <div className="bg-slate-900 border-4 border-emerald-600 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(16,185,129,0.3)] w-full max-w-sm text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)] mb-5 animate-bounce">
                <span className="text-white font-black text-3xl leading-none">↑</span>
              </div>

              <h3 className="text-emerald-400 font-black uppercase tracking-widest text-xl mb-3">Update Necesar</h3>

              <p className="text-slate-300 text-sm font-bold mb-8 leading-snug">
                Echipa a adus modificări tactice importante. Pentru a continua vizualizarea platformei, este obligatoriu să instalezi noua versiune.
              </p>

              <button
                type="button"
                onClick={() => {
                  if (updateRegistration?.waiting) {
                    updateRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
                  }
                }}
                className="w-full py-4 text-sm font-black uppercase tracking-widest text-white bg-emerald-600 rounded-xl border-b-4 border-emerald-800 hover:translate-y-[2px] hover:border-b-2 transition-all shadow-md cursor-pointer"
              >
                Instalează Acum
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