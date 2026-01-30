import React, { useState, useEffect } from 'react';
import { Home, Users, Star, Heart, ShoppingBag, Menu, X, LogOut, User, Settings, ShieldAlert, Moon, Sun } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// --- IMPORTURI COMPONENTE ---
import { HomeSection } from './components/HomeSection';
import { DiasporaSection } from './components/DiasporaSection';
import { FutureStarsSection } from './components/FutureStarsSection';
import { UnsungHeroesSection } from './components/UnsungHeroesSection';
import { CollectorsHubSection } from './components/CollectorsHubSection';
import { AuthPage } from './components/AuthPage';
import { ProfileSection } from './components/ProfileSection'; // <--- NOU
import { AdminDashboard } from './components/AdminDashboard'; // <--- NOU

const Button = ({ children, onClick, variant, className, disabled }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
    ghost: "hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200",
    secondary: "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white",
    destructive: "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant || 'default']} ${className || ''}`}>{children}</button>;
};

type Section = 'home' | 'diaspora' | 'stars' | 'heroes' | 'collectors' | 'profile' | 'admin';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{name: string, email: string, role?: string, avatar?: string} | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // --- 1. INITIALIZARE (User + Theme) ---
  useEffect(() => {
    // User
    const savedUser = localStorage.getItem('footballAppUser');
    if (savedUser) setUser(JSON.parse(savedUser));

    // Theme
    const savedTheme = localStorage.getItem('footballAppTheme') as 'light' | 'dark';
    if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('footballAppTheme', newTheme);
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  const handleLoginSuccess = (userData: any) => {
      setUser(userData);
      localStorage.setItem('footballAppUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
      setUser(null);
      setActiveSection('home');
      localStorage.removeItem('footballAppUser');
  };

  const navigation = [
    { id: 'home' as Section, label: 'Home', icon: Home },
    { id: 'diaspora' as Section, label: 'Diaspora', icon: Users },
    { id: 'stars' as Section, label: 'Future Stars', icon: Star },
    { id: 'heroes' as Section, label: 'Eroi', icon: Heart },
    { id: 'collectors' as Section, label: "Collectors", icon: ShoppingBag },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'home': return <HomeSection user={user!} onNavigate={setActiveSection} />;
      case 'diaspora': return <DiasporaSection />;
      case 'stars': return <FutureStarsSection />;
      case 'heroes': return <UnsungHeroesSection />;
      case 'collectors': return <CollectorsHubSection user={user!} />;
      case 'profile': return <ProfileSection user={user!} onUpdateUser={handleLoginSuccess} />; // <--- NOU
      case 'admin': return <AdminDashboard user={user!} />; // <--- NOU
      default: return <HomeSection user={user!} onNavigate={setActiveSection} />;
    }
  };

  if (!user) return <><Toaster /><AuthPage onLoginSuccess={handleLoginSuccess} /></>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />

      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* LOGO */}
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveSection('home')}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 via-yellow-500 to-red-600 shadow-md">
                <span className="text-lg font-bold text-white">RO</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-none">România<br/><span className="text-blue-600 dark:text-blue-400">Scout</span></h1>
              </div>
            </div>

            {/* NAVIGARE DESKTOP */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                  <Button key={item.id} variant={activeSection === item.id ? 'secondary' : 'ghost'} onClick={() => setActiveSection(item.id)} className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
              ))}
            </nav>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-2">
              
              {/* DARK MODE TOGGLE */}
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  {theme === 'light' ? <Moon className="h-5 w-5 text-slate-600" /> : <Sun className="h-5 w-5 text-yellow-400" />}
              </button>

              <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-slate-700">
                 {/* ADMIN BUTTON (Doar dacă e admin - simulare) */}
                 {(user.email === 'admin@scout.ro' || user.role === 'admin') && (
                     <Button variant={activeSection === 'admin' ? 'default' : 'ghost'} onClick={() => setActiveSection('admin')} className="text-red-600 hover:text-red-700">
                        <ShieldAlert className="h-4 w-4 mr-1" /> Admin
                     </Button>
                 )}

                 {/* PROFILE BUTTON */}
                 <Button variant={activeSection === 'profile' ? 'secondary' : 'ghost'} onClick={() => setActiveSection('profile')} className="gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                        {user.name.charAt(0)}
                    </div>
                    <span className="max-w-[100px] truncate">{user.name.split(' ')[0]}</span>
                 </Button>

                 <Button variant="destructive" onClick={handleLogout} className="h-8 w-8 p-0 rounded-full">
                     <LogOut className="h-4 w-4" />
                 </Button>
              </div>
              
              <Button variant="ghost" className="md:hidden px-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 shadow-lg flex flex-col gap-2">
            {navigation.map((item) => (
              <Button key={item.id} variant={activeSection === item.id ? 'secondary' : 'ghost'} onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }} className="w-full justify-start gap-3 h-12">
                <item.icon className="h-5 w-5" /> {item.label}
              </Button>
            ))}
            <div className="border-t border-gray-100 dark:border-slate-800 my-2"></div>
            <Button variant="ghost" onClick={() => { setActiveSection('profile'); setMobileMenuOpen(false); }} className="w-full justify-start gap-3"><Settings className="h-5 w-5" /> Profilul Meu</Button>
            <Button variant="destructive" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start gap-3"><LogOut className="h-5 w-5" /> Deconectare</Button>
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 relative">
        {renderSection()}
      </main>
    </div>
  );
}