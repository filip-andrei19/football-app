import React, { useState, useEffect } from 'react';
import { Home, Users, Star, Heart, ShoppingBag, Menu, X, LogOut, User, Settings, ShieldAlert, Moon, Sun, Calendar, AlertTriangle } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast'; 

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
const Button = ({ children, onClick, variant, className, disabled }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 h-10 px-4 py-2 outline-none disabled:opacity-50 border shadow-sm";
  const variants: any = {
    // Verde intens de gazon cu margini de teren (alb/contur luminos)
    default: "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]",
    // Buton discret care imită plasele de poartă sau scaunele
    ghost: "border-transparent text-slate-700 hover:text-emerald-600 dark:text-slate-200 dark:hover:text-emerald-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
    // Gri sportiv pentru secțiuni neutre
    secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700",
    // Roșu "Fault" sau "Cartonaș roșu" pentru actiuni distructive sau deconectare
    destructive: "bg-rose-600 hover:bg-rose-500 text-white border-rose-500/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]"
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant || 'default']} ${className || ''}`}>{children}</button>;
};

type Section = 'home' | 'diaspora' | 'stars' | 'heroes' | 'collectors' | 'matches' | 'profile' | 'admin';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{name: string, email: string, role?: string, avatar?: string, hasAdminDeletedMessages?: boolean, _id?: string} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // State nou pentru avertismentul permanent de pe ecran
  const [showWarning, setShowWarning] = useState(false);

  // State pentru chat
  const [activeChatRoom, setActiveChatRoom] = useState("general_chat");
  const [activeChatPartner, setActiveChatPartner] = useState<{ name: string, avatar?: string } | null>(null);

  // State pentru produsul partajat (din URL)
  const [sharedPostId, setSharedPostId] = useState<string | null>(null);

  // Returnăm direct datele, nu mai ștergem avertismentul aici
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

  // Efect nou care declanșează bannerul dacă userul logat are un mesaj șters
  // și nu a apăsat deja pe "X" (stocat în localStorage)
  useEffect(() => {
      if (user && user.hasAdminDeletedMessages) {
          // Folosim emailul pentru cheia unică, deoarece _id poate să nu fie tot timpul disponibil la login
          const aMaiVazutAvertismentul = localStorage.getItem(`warning_ack_${user.email}`);
          if (!aMaiVazutAvertismentul) {
              setShowWarning(true);
          }
      }
  }, [user]);

  // Funcția care închide mesajul și previne reafișarea lui
  const handleDismissWarning = () => {
      setShowWarning(false);
      
      if (user?.email) {
          // Salvăm în memoria browserului
          localStorage.setItem(`warning_ack_${user.email}`, 'true');
          
          // Ștergem avertismentul definitiv din Baza de Date
          const backendUrl = (import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api` : 'https://football-backend-m2a4.onrender.com/api';
          
          fetch(`${backendUrl}/users/clear-warning`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email })
          }).catch((err) => console.error("Eroare la curățarea avertismentului din DB:", err));
      }
      
      // Actualizăm starea locală a utilizatorului ca să nu mai declanșeze nimic
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

  // Handler Chat
  const handleOpenChat = (roomId: string, partner: { name: string, avatar?: string }) => {
      setActiveChatRoom(roomId);
      setActiveChatPartner(partner);
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'admin.nou@scout.ro';

  const navigation = [
    { id: 'home' as Section, label: 'Home', icon: Home },
    { id: 'matches' as Section, label: 'Meciuri', icon: Calendar }, 
    { id: 'diaspora' as Section, label: 'Diaspora', icon: Users },
    { id: 'stars' as Section, label: 'Future Stars', icon: Star },
    { id: 'heroes' as Section, label: 'Eroi', icon: Heart },
    { id: 'collectors' as Section, label: "Collectors", icon: ShoppingBag },
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
    // S-a aplicat o textură subtilă de gazon natural („bg-grid-pattern” sau gradient de meci de noapte în funcție de mod)
    <div className="min-h-screen bg-slate-50 dark:bg-emerald-950/20 text-slate-900 dark:text-emerald-50 flex flex-col font-sans transition-colors duration-500 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950">
      
      {/* Background decorativ subtil pentru meci de noapte în modul dark (efect de nocturnă și linii vagi de teren) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#064e3b', color: '#fff', border: '1px solid #10b981' } }} />

      {/* Header cu aspect modern-sportiv de fanzone / tribună */}
      <header className="sticky top-0 z-50 border-b-2 border-emerald-500/20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors duration-300 shadow-md">
        
        {/* Tri-colorul românesc subtil în partea de sus a headerului ca o bandă de meci */}
        <div className="h-[4px] w-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-600"></div>

        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo de club fotbalistic / scouting */}
            <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => setActiveSection('home')}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-yellow-500 to-red-600 shadow-[0_4px_10px_rgba(0,0,0,0.15)] transform group-hover:scale-105 transition-transform">
                <span className="text-lg font-extrabold text-white tracking-tighter">RO</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black leading-none uppercase tracking-tight text-slate-800 dark:text-white">România<br/>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm font-bold tracking-wider">Scout</span>
                </h1>
              </div>
            </div>

            {/* Meniu tip marcaj de teren (sportiv/dinamic) */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navigation.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-extrabold uppercase tracking-wider transition-all duration-300 ${
                          isActive 
                            ? "bg-emerald-600 text-white border-2 border-emerald-400/30 shadow-md shadow-emerald-900/10" 
                            : "text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 border-2 border-transparent hover:border-emerald-500/20"
                        }`}
                      >
                        <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} /> 
                        {item.label}
                      </button>
                  );
              })}
            </nav>

            {/* Secțiunea de login și acțiuni din dreapta */}
            <div className="flex items-center gap-2.5">
              <button onClick={toggleTheme} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all">
                  {theme === 'light' ? <Moon className="h-5 w-5 text-slate-600" /> : <Sun className="h-5 w-5 text-yellow-400" />}
              </button>

              <div className="hidden md:flex items-center gap-2 ml-1 pl-3 border-l-2 border-slate-200 dark:border-slate-800">
                 {isAdmin && (
                     <Button 
                       variant="destructive" 
                       onClick={() => setActiveSection('admin')} 
                       className={`border-rose-500 font-extrabold text-xs uppercase tracking-widest ${
                         activeSection === 'admin' 
                           ? 'bg-rose-700 hover:bg-rose-600 border-rose-400' 
                           : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/20'
                       }`}
                     >
                        <ShieldAlert className="h-4 w-4 mr-1.5" /> Admin
                     </Button>
                 )}
                 <Button 
                   variant={activeSection === 'profile' ? 'secondary' : 'ghost'} 
                   onClick={() => setActiveSection('profile')} 
                   className="gap-2.5 px-3 border border-slate-200 dark:border-slate-800"
                 >
                    {/* Rama avatarului are model hexagonal / cusătură de minge de fotbal */}
                    <div className="w-6.5 h-6.5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-xs font-black text-emerald-700 dark:text-emerald-300 overflow-hidden ring-2 ring-emerald-500/30">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : user.name.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate uppercase tracking-wider">{user.name.split(' ')[0]}</span>
                 </Button>
                 <Button variant="destructive" onClick={handleLogout} className="gap-2 ml-1 h-10 border-rose-600/30 font-bold" title="Deconectare">
                     <LogOut className="h-4 w-4" />
                     <span className="hidden lg:inline">Ieşire</span>
                 </Button>
              </div>
              
              <Button variant="ghost" className="md:hidden px-2 h-10 border border-slate-200 dark:border-slate-800 hover:bg-emerald-500/10 hover:border-emerald-500/20" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Meniu mobil ajustat sportiv */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-emerald-500/20 bg-white dark:bg-slate-900 px-4 py-4 shadow-lg flex flex-col gap-2 animate-in slide-in-from-top-5">
            {navigation.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Button 
                  key={item.id} 
                  variant={isActive ? 'default' : 'ghost'} 
                  onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }} 
                  className={`w-full justify-start gap-3.5 h-12 border ${isActive ? 'bg-emerald-600 border-emerald-400/30' : 'border-transparent text-left'}`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} /> {item.label}
                </Button>
              );
            })}
            {isAdmin && (
                <Button variant="destructive" onClick={() => { setActiveSection('admin'); setMobileMenuOpen(false); }} className="w-full justify-start gap-3.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30 h-12">
                    <ShieldAlert className="h-5 w-5" /> Panou Administrator
                </Button>
            )}
            <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>
            <Button variant="ghost" onClick={() => { setActiveSection('profile'); setMobileMenuOpen(false); }} className="w-full justify-start gap-3.5 h-12"><Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Profilul Meu</Button>
            <Button variant="destructive" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start gap-3.5 h-12"><LogOut className="h-5 w-5" /> Deconectare</Button>
          </div>
        )}
      </header>

      {/* Secțiunea centrală (Gazon/Matchday decorat cu elemente de stadion) */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {renderSection()}
      </main>

      {/* AVERTISMENT ADMIN (Permanent până la Dismiss - Redesenat ca un cartonaș de avertizare în stil de arbitraj, 100% fotbal) */}
      {showWarning && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-rose-500 rounded-2xl p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[9999] w-[90%] max-w-sm flex items-start gap-3.5 animate-in slide-in-from-bottom-5">
          {/* Cartonaș de avertizare (sport) în loc de o alertă generică */}
          <div className="w-6.5 h-9 rounded bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] flex items-center justify-center shrink-0 border border-rose-400 self-center">
            <span className="text-xs font-black text-white leading-none">!</span>
          </div>
          
          <div className="flex-1">
            <h4 className="text-rose-500 text-xs font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Cartonaş Roşu / Penalty
            </h4>
            <p className="text-slate-100 text-sm font-bold leading-snug tracking-wide">
              Administratorul ți-a șters unul sau mai multe mesaje pentru limbaj sau conduită neadecvată pe forum.
            </p>
          </div>
          
          <button 
            onClick={handleDismissWarning} 
            className="text-slate-400 hover:text-white p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-800 rounded-full transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Widget-ul de chat de jos (cu starea sa, redesenat sportiv cu minge / radar fotbalistic în components/ChatWidget.tsx) */}
      {user && (
          <ChatWidget 
            key={activeChatRoom} 
            user={user} 
            roomID={activeChatRoom} 
            chatPartner={activeChatPartner}
          />
      )}
    </div>
  );
}