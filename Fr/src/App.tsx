import React, { useState } from 'react';
import { Home, Users, Star, Heart, ShoppingBag, Menu, X, LogIn, LogOut } from 'lucide-react';

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
    secondary: "bg-gray-100 text-gray-900", // Am adaugat stil pentru buton activ
    outline: "border border-gray-200 bg-white hover:bg-gray-50",
    destructive: "text-red-600 hover:bg-red-50"
  };
  return <button type={type || "button"} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant || 'default']} ${className || ''}`}>{children}</button>;
};

// --- AUTH MODAL (SIMPLU) ---
const AuthPage = ({ onClose, onLoginSuccess }: any) => {
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
            setError("Serverul nu răspunde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="h-5 w-5"/></button>
                
                <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">
                    {isRegistering ? "Creează Cont" : "Autentificare"}
                </h2>

                {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded mb-4 text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegistering && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Nume</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                        <input 
                            type="email" 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Parolă</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full font-bold">
                        {loading ? "Se încarcă..." : (isRegistering ? "Înregistrează-te" : "Intră în cont")}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <button 
                        onClick={() => { setIsRegistering(!isRegistering); setError(""); }}
                        className="text-blue-600 text-sm hover:underline"
                    >
                        {isRegistering ? "Ai deja cont? Loghează-te" : "Nu ai cont? Creează unul"}
                    </button>
                </div>
            </div>
        </div>
    );
};

type Section = 'home' | 'diaspora' | 'stars' | 'heroes' | 'collectors';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const isLoggedIn = user !== null;

  const handleLoginSuccess = (userData: any) => {
      setUser(userData);
      setShowAuth(false);
  };

  const handleLogout = () => {
      setUser(null);
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

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans">
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

            {/* DESKTOP MENU (ASCUNS PE MOBIL) */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                  <Button key={item.id} variant={activeSection === item.id ? 'secondary' : 'ghost'} onClick={() => setActiveSection(item.id)} className="gap-2">
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Button>
              ))}
            </nav>

            {/* ACTIONS RIGHT */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex">
                {isLoggedIn ? (
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-blue-800">Salut, {user?.name}!</span>
                        <Button variant="destructive" onClick={handleLogout} className="h-8 text-xs">
                            <LogOut className="h-3 w-3 mr-1" /> Logout
                        </Button>
                    </div>
                ) : (
                    <Button variant="default" onClick={() => setShowAuth(true)} className="gap-2">
                        <LogIn className="h-4 w-4" /> Sign In
                    </Button>
                )}
              </div>
              
              {/* MOBILE HAMBURGER BUTTON */}
              <Button variant="ghost" className="md:hidden px-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------- */}
        {/* MENIUL DE MOBIL (Apare când apeși pe iconiță) */}
        {/* ------------------------------------------- */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 shadow-lg flex flex-col gap-2">
            
            {/* NAVIGAȚIE */}
            {navigation.map((item) => (
              <Button 
                key={item.id} 
                variant={activeSection === item.id ? 'secondary' : 'ghost'} 
                onClick={() => {
                   setActiveSection(item.id);
                   setMobileMenuOpen(false); // Închide meniul după click
                }} 
                className="w-full justify-start gap-3 h-12 text-base"
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                {item.label}
              </Button>
            ))}

            <div className="border-t border-gray-100 my-2"></div>

            {/* LOGIN / LOGOUT PE MOBIL */}
            {isLoggedIn ? (
               <div className="flex flex-col gap-2">
                 <div className="px-4 py-2 text-sm text-gray-500 font-semibold">
                    Logat ca {user?.name}
                 </div>
                 <Button variant="destructive" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start gap-3">
                    <LogOut className="h-5 w-5" /> Deconectare
                 </Button>
               </div>
            ) : (
               <Button variant="default" onClick={() => { setShowAuth(true); setMobileMenuOpen(false); }} className="w-full justify-center gap-2 bg-blue-900 text-white py-6">
                  <LogIn className="h-5 w-5" /> Intră în cont
               </Button>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 animate-in fade-in duration-500">
        {renderSection()}
      </main>

      {showAuth && <AuthPage onClose={() => setShowAuth(false)} onLoginSuccess={handleLoginSuccess} />}
    </div>
  );
}