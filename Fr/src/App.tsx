import React, { useState, useEffect } from 'react';
import { Home, Users, Star, Heart, ShoppingBag, Menu, X, LogIn, LogOut, Shield, ArrowRight, User, Mail, Lock } from 'lucide-react';

// --- IMPORTURI ---
import { HomeSection } from './components/HomeSection';
import { DiasporaSection } from './components/DiasporaSection';
import { FutureStarsSection } from './components/FutureStarsSection';
import { UnsungHeroesSection } from './components/UnsungHeroesSection';
import { CollectorsHubSection } from './components/CollectorsHubSection';

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

// --- AUTH PAGE (STANDALONE - PAGINA DE START) ---
// Am scos butonul de Close (X) pentru că acum e pagina obligatorie de start
const AuthPage = ({ onLoginSuccess }: any) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: "", 
        email: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const endpoint = isRegistering ? '/api/users/register' : '/api/users/login';
        
        try {
            const response = await fetch(`https://football-backend-m2a4.onrender.com${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                onLoginSuccess(data.user);
            } else {
                setError(data.message || "Eroare la conectare.");
            }
        } catch (err) {
            setError("Serverul nu răspunde. Verifică conexiunea.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
                
                {/* Header Tricolor */}
                <div className="h-2 bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600"></div>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4 shadow-sm">
                           <Shield className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                          {isRegistering ? 'Alătură-te Echipei' : 'Bine ai revenit!'}
                        </h1>
                        <p className="text-gray-500 text-sm">
                          Scouting, Statistici și Diaspora Tricoloră
                        </p>
                    </div>

                    {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4 text-center border border-red-100">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegistering && (
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Numele tău"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                            </div>
                        )}
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="email" 
                                placeholder="Email"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                            <input 
                                type="password" 
                                placeholder="Parola"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={loading} className="w-full font-bold py-6 text-base gap-2">
                            {loading ? "Se procesează..." : (isRegistering ? "Creează Cont" : "Intră în Cont")}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
                            className="text-blue-600 text-sm hover:underline font-medium"
                        >
                            {isRegistering ? "Ai deja cont? Loghează-te" : "Nu ai cont? Creează unul"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

type Section = 'home' | 'diaspora' | 'stars' | 'heroes' | 'collectors';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Starea utilizatorului
  const [user, setUser] = useState<{name: string, email: string} | null>(null);

  // --- 1. PERSISTENȚA SESIUNII (Nu te scoate dacă dai refresh) ---
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
      // Salvăm userul în browser
      localStorage.setItem('footballAppUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
      setUser(null);
      setActiveSection('home'); // Resetăm secțiunea la logout
      // Ștergem userul din browser
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
  
  // Dacă NU suntem logați, arătăm DOAR pagina de Auth
  if (!user) {
      return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Dacă SUNTEM logați, arătăm aplicația completă
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
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 shadow-lg flex flex-col gap-2">
            
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