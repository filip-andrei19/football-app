import React, { useState, useEffect } from 'react';
import { Home, Users, Star, Heart, ShoppingBag, Menu, X, LogOut, User, Settings, ShieldAlert, Moon, Sun, Calendar, AlertTriangle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { HomeSection } from './components/HomeSection';
import { DiasporaSection } from './components/DiasporaSection';
import { FutureStarsSection } from './components/FutureStarsSection';
import { UnsungHeroesSection } from './components/UnsungHeroesSection';
import { CollectorsHubSection } from './components/CollectorsHubSection';
import { AuthPage } from './components/AuthPage';
import { ProfileSection } from './components/ProfileSection'; 
import { AdminDashboard } from './components/AdminDashboard'; 
import { ChatWidget } from './components/ChatWidget'; 
import { MatchesSection } from './components/MatchesSection';

// Noul buton cu design sportiv care folosește „linii de teren” și texturi fotbalistice
const Button = ({ children, onClick, variant, className, disabled, title }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all duration-300 h-10 sm:h-12 px-4 sm:px-5 outline-none disabled:opacity-50 border-b-4 hover:border-b-2 hover:translate-y-[2px] shadow-sm";
  const variants: any = {
    default: "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-800",
    ghost: "border-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:border-b-4 hover:translate-y-0",
    secondary: "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800",
    destructive: "bg-rose-600 hover:bg-rose-500 text-white border-rose-800"
  };
  return <button onClick={onClick} disabled={disabled} title={title} className={`${baseStyle} ${variants[variant || 'default']} ${className || ''}`}>{children}</button>;
};

type Section = 'home' | 'diaspora' | 'stars' | 'heroes' | 'collectors' | 'matches' | 'profile' | 'admin';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{name: string, email: string, role?: string, avatar?: string, hasAdminDeletedMessages?: boolean, _id?: string} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const [showWarning, setShowWarning] = useState(false);

  const [activeChatRoom, setActiveChatRoom] = useState("general_chat");
  const [activeChatPartner, setActiveChatPartner] = useState<{ name: string, avatar?: string } | null>(null);

  const [sharedPostId, setSharedPostId] = useState<string | null>(null);

  // ==========================================
  // Vite PWA: Hook oficial pentru actualizare
  // ==========================================
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Eroare înregistrare Service Worker', error);
    },
  });

  const checkAdminWarnings = (userData: any) => {
      return userData;
  };

  useEffect(() => {
    const syncUserData = async () => {
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
    };
    syncUserData();
  }, []);

  useEffect(() => {
      if (user && user.hasAdminDeletedMessages) {
          const aMaiVazutAvertismentul = localStorage.getItem(`warning_ack_${user.email}`);
          if (!aMaiVazutAvertismentul) {
              setShowWarning(true);
          }
      }
  }, [user]);

  const handleDismissWarning = () => {
      setShowWarning(false);
      
      if (user?.email) {
          localStorage.setItem(`warning_ack_${user.email}`, 'true');
          
          const backendUrl = (import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : 'https://football-backend-m2a4.onrender.com/api';
          
          fetch(`${backendUrl}/users/clear-warning`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email })
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
  };

  const handleOpenChat = (roomId: string, partner: { name: string, avatar?: string }) => {
      setActiveChatRoom(roomId);
      setActiveChatPartner(partner);
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'admin.nou@scout.ro';

  const navigation = [
    { id: 'home' as Section, label: 'Teren', icon: Home },
    { id: 'matches' as Section, label: 'Meciuri', icon: Calendar }, 
    { id: 'diaspora' as Section, label: 'Lotul Național', icon: Users },
    { id: 'stars' as Section, label: 'Tineri', icon: Star },
    { id: 'heroes' as Section, label: 'Legende', icon: Heart },
    { id: 'collectors' as Section, label: "Fanshop", icon: ShoppingBag },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'home': return <HomeSection user={user!} onNavigate={setActiveSection} />;
      case 'matches': return <MatchesSection userEmail={user?.email} />;      
      case 'diaspora': return <DiasporaSection />;
      case 'stars': return <FutureStarsSection />;
      case 'heroes': return <UnsungHeroesSection />;
      case 'collectors': return <CollectorsHubSection user={user!} onOpenChat={handleOpenChat} initialPostId={sharedPostId} />;
      case 'profile': return <ProfileSection user={user!} onUpdateUser={handleLoginSuccess} onLogout={handleLogout} />; 
      case 'admin': return isAdmin ? <AdminDashboard user={user!} /> : <HomeSection user={user!} onNavigate={setActiveSection} />;
      default: return <HomeSection user={user!} onNavigate={setActiveSection} />;
    }
  };

  if (!user) return <><Toaster /><AuthPage onLoginSuccess={handleLoginSuccess} /></>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-emerald-50 flex flex-col font-sans transition-colors duration-500 relative overflow-hidden">
      
      {/* Background decorativ subtil - gazon/meci de noapte */}
      <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_40px,#000_40px,#000_42px)]"></div>
      
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#020617', color: '#fff', border: '2px solid #10b981', borderRadius: '16px', fontWeight: '900', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px' } }} />

      {/* HEADER TACTIC (Tabelă) - Prioritate Z redusă la 30 pentru a nu mai suprapune modalele! */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors duration-300 shadow-lg border-b-4 border-slate-200 dark:border-slate-800">
        
        {/* Tri-colorul românesc subtil ca o bandă */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600 flex">
            <div className="flex-1 bg-blue-600"></div>
            <div className="flex-1 bg-yellow-400"></div>
            <div className="flex-1 bg-red-600"></div>
        </div>

        <div className="container mx-auto px-4">
          <div className="flex h-20 items-center justify-between">
            
            {/* Logo de club fotbalistic */}
            <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => setActiveSection('home')}>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 border-2 border-slate-800 shadow-[0_4px_15px_rgba(0,0,0,0.2)] transform group-hover:scale-105 transition-transform group-hover:border-emerald-500">
                <span className="text-xl font-black text-white tracking-tighter">RO</span>
              </div>
              <div className="hidden lg:block">
                <h1 className="text-xl font-black leading-none uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Scout<br/>
                  <span className="text-slate-400 text-xs tracking-widest">România</span>
                </h1>
              </div>
            </div>

            {/* Meniu Principal (Desktop) */}
            <nav className="hidden lg:flex items-center gap-2">
              {navigation.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] xl:text-xs font-black uppercase tracking-widest transition-all duration-300 border-b-4 ${
                          isActive 
                            ? "bg-emerald-600 text-white border-emerald-800 shadow-md translate-y-[-2px]" 
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} /> 
                        {item.label}
                      </button>
                  );
              })}
            </nav>

            {/* Acțiuni (Profil, Teme, Mobile Menu) */}
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-colors">
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>

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
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name.charAt(0)}
                    </div>
                    <span className="max-w-[120px] truncate">{user.name.split(' ')[0]}</span>
                 </Button>
                 <Button variant="destructive" onClick={handleLogout} className="!px-3 border-b-4 border-rose-800 hover:bg-rose-600 bg-slate-100 dark:bg-slate-900 text-rose-500 dark:text-rose-500 border-slate-200 dark:border-slate-800" title="Părăsește Terenul">
                     <LogOut className="h-4 w-4" />
                 </Button>
              </div>
              
              <Button variant="ghost" className="lg:hidden !px-3 h-12 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-500" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Meniu mobil ajustat sportiv */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 shadow-xl flex flex-col gap-3 animate-in slide-in-from-top-5 absolute w-full">
            {navigation.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Button 
                  key={item.id} 
                  variant={isActive ? 'default' : 'ghost'} 
                  onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }} 
                  className={`w-full justify-start gap-4 border-b-4 ${isActive ? 'bg-emerald-600 border-emerald-800' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'}`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} /> {item.label}
                </Button>
              );
            })}
            
            <div className="border-t-2 border-slate-200 dark:border-slate-800 my-2"></div>
            
            {isAdmin && (
                <Button variant="destructive" onClick={() => { setActiveSection('admin'); setMobileMenuOpen(false); }} className="w-full justify-start gap-4 border-b-4 border-rose-800">
                    <ShieldAlert className="h-5 w-5" /> Comisia Centrală (Admin)
                </Button>
            )}
            
            <div className="flex gap-3 mt-2">
                <Button variant="secondary" onClick={() => { setActiveSection('profile'); setMobileMenuOpen(false); }} className="flex-1 justify-center gap-3 border-b-4 border-slate-300 dark:border-slate-950">
                    <Settings className="h-5 w-5 text-slate-400" /> Vestiar (Profil)
                </Button>
                <Button variant="destructive" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex-1 justify-center gap-3 border-b-4 border-rose-800 bg-slate-100 dark:bg-slate-900 text-rose-500 border-slate-200 dark:border-slate-800 hover:bg-rose-500 hover:text-white">
                    <LogOut className="h-5 w-5" /> Ieșire
                </Button>
            </div>
          </div>
        )}
      </header>

      {/* Secțiunea centrală (Terenul de Joc) - Z-index eliminat aici pentru a permite modalelor să depășească navbar-ul */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 relative">
        {renderSection()}
      </main>

      {/* AVERTISMENT ADMIN (Cartonaș Roșu VAR) */}
      {showWarning && (
        <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border-4 border-rose-600 rounded-3xl p-5 shadow-[0_20px_50px_rgba(225,29,72,0.5)] z-[9999] w-[92%] max-w-md flex items-start gap-4 animate-in slide-in-from-bottom-5">
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
            onClick={handleDismissWarning} 
            className="text-slate-400 hover:text-white hover:bg-rose-600 p-2 bg-slate-800 border-2 border-slate-700 hover:border-rose-500 rounded-xl transition-all shrink-0"
          >
            <X className="w-5 h-5 font-bold" />
          </button>
        </div>
      )}

      {/* WIDGET CHAT (Preluat din Componente) */}
      {user && (
          <ChatWidget 
            key={activeChatRoom} 
            user={user} 
            roomID={activeChatRoom} 
            chatPartner={activeChatPartner}
          />
      )}

      {/* ECRAN DE BLOCARE PENTRU UPDATE OBLIGATORIU */}
      {needRefresh && (
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
              onClick={() => updateServiceWorker(true)}
              className="w-full py-4 text-sm font-black uppercase tracking-widest text-white bg-emerald-600 rounded-xl border-b-4 border-emerald-800 hover:translate-y-[2px] hover:border-b-2 transition-all shadow-md cursor-pointer"
            >
              Instalează Acum
            </button>
            
          </div>
        </div>
      )}
    </div>
  );
}