import React, { useState, useEffect } from 'react';
import { Home, Users, Star, Heart, ShoppingBag, Menu, X, LogOut } from 'lucide-react';

// --- IMPORTURI ---
import { HomeSection } from './components/HomeSection';
import { DiasporaSection } from './components/DiasporaSection';
import { FutureStarsSection } from './components/FutureStarsSection';
import { UnsungHeroesSection } from './components/UnsungHeroesSection';
import { CollectorsHubSection } from './components/CollectorsHubSection';

// IMPORTANT: Importăm AuthPage din fișierul separat (cel cu design frumos)
import { AuthPage } from './components/AuthPage';

// --- HELPER BUTTON ---
const Button = ({ children, onClick, variant, className, type, disabled }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";
  const variants: any = {
    default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
    ghost: "hover:bg-gray-100 text-gray-700",
    secondary: "bg-gray-100 text-gray-900",
    outline: "border border-gray-200 bg-white hover:bg-gray-50",
    destructive: "text-red-600 hover:bg-red-50"
  };
  return <button type={type || "button"} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant || 'default']} ${className || ''}`}>{children}</button>;
};

type Section = 'home' | 'diaspora' | 'stars' | 'heroes' | 'collectors';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Starea utilizatorului
  const [user, setUser] = useState<{name: string, email: string} | null>(null);

  // --- 1. PERSISTENȚA SESIUNII ---
  useEffect(() => {
    const savedUser = localStorage.getItem('footballAppUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Eroare la citirea userului", e);
      }
    }
  }, []);

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
    { id: 'heroes' as Section, label: 'Unsung Heroes', icon: Heart },
    { id: 'collectors' as Section, label: "Collectors", icon: ShoppingBag },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'home': return <HomeSection onNavigate={setActiveSection} />;
      case 'diaspora': return <DiasporaSection />;
      case 'stars': return <FutureStarsSection />;
      case 'heroes': return <UnsungHeroesSection />;
      case 'collectors': return <CollectorsHubSection />;
      default: return <HomeSection onNavigate={setActiveSection} />;
    }
  };

  // --- 2. LOGICA DE AFIȘARE (GATEKEEPER) ---
  
  // Dacă NU suntem logați, arătăm pagina de Auth (din fișierul separat)
  if (!user) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Dacă SUNTEM logați, arătăm aplicația
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans animate-in fade-in duration-700">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* LOGO */}
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveSection('home')}>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 via-yellow-500 to-red-600 shadow-md">
                <span className="text-lg font-bold text-white">RO</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold leading-none">România Fotbal</h1>
              </div>
            </div>

            {/* DESKTOP MENU */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                  <Button key={item.id} variant={activeSection === item.id ? 'secondary' : 'ghost'} onClick={() => setActiveSection(item.id)} className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
              ))}
            </nav>

            {/* ACTIONS RIGHT */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3">
                 <span className="text-sm font-bold text-blue-800">Salut, {user.name}!</span>
                 <Button variant="destructive" onClick={handleLogout} className="h-8 text-xs">
                     <LogOut className="h-3 w-3 mr-1" /> Logout
                 </Button>
              </div>
              
              {/* MOBILE HAMBURGER BUTTON */}
              <Button variant="ghost" className="md:hidden px-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* MENIUL DE MOBIL */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 shadow-lg flex flex-col gap-2 animate-in slide-in-from-top-2">
            
            {navigation.map((item) => (
              <Button 
                key={item.id} 
                variant={activeSection === item.id ? 'secondary' : 'ghost'} 
                onClick={() => {
                   setActiveSection(item.id);
                   setMobileMenuOpen(false);
                }} 
                className="w-full justify-start gap-3 h-12 text-base"
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                {item.label}
              </Button>
            ))}

            <div className="border-t border-gray-100 my-2"></div>

            <div className="flex flex-col gap-2">
              <div className="px-4 py-2 text-sm text-gray-500 font-semibold">
                Logat ca {user.name}
              </div>
              <Button variant="destructive" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start gap-3">
                 <LogOut className="h-5 w-5" /> Deconectare
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {renderSection()}
      </main>
    </div>
  );
}