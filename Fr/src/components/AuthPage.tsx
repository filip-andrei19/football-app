import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, Shield, Star, AlertCircle } from 'lucide-react';

// --- CONFIGURARE IMAGINI ---
// Aici poți înlocui link-urile cu poze reale locale (ex: import hagi from './hagi.jpg')
const ROMANIAN_FOOTBALL_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1522778119026-d647f0565c6a?q=80&w=2940&auto=format&fit=crop",
    alt: "Stadion Noaptea",
    description: "Arenele legendare"
  },
  {
    url: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=2831&auto=format&fit=crop",
    alt: "Echipament Galben", // Amintește de Națională
    description: "Spiritul Tricolor"
  },
  {
    url: "https://images.unsplash.com/photo-1504064030616-5bc77b968412?q=80&w=2940&auto=format&fit=crop",
    alt: "Atmosferă Suporteri", // Amintește de peluzele din Liga 1
    description: "Pasiune din tribune"
  }
];

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State pentru slider-ul de imagini
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Efect pentru schimbarea automată a imaginilor la fiecare 5 secunde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % ROMANIAN_FOOTBALL_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
    
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
        setError(data.message || 'Ceva nu a mers bine.');
      }
    } catch (err) {
      setError('Eroare de server. Verifică conexiunea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 overflow-hidden font-sans">
      
      {/* --- PARTEA STÂNGĂ: SLIDER IMAGINI --- */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900 overflow-hidden">
         
         {/* Mapăm imaginile pentru a crea efectul de cross-fade */}
         {ROMANIAN_FOOTBALL_IMAGES.map((img, index) => (
            <div 
              key={index}
              className={`absolute inset-0 bg-cover bg-center transition-all duration-[1500ms] ease-in-out transform
                ${index === currentImageIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}
              `}
              style={{ backgroundImage: `url(${img.url})` }}
            ></div>
         ))}
         
         {/* Gradient Overlay */}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-900/50 to-black/80"></div>

         {/* Conținut Text pe Imagine */}
         <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white w-full">
             <div>
                <div className="flex items-center gap-2 font-bold tracking-widest text-sm opacity-90">
                    <Shield className="w-5 h-5 text-yellow-400" />
                    SCOUT ROMÂNIA
                </div>
                {/* Linia Tricoloră Decorativă */}
                <div className="h-1 w-16 flex mt-2">
                    <div className="h-full w-1/3 bg-blue-600"></div>
                    <div className="h-full w-1/3 bg-yellow-400"></div>
                    <div className="h-full w-1/3 bg-red-600"></div>
                </div>
             </div>

             <div className="max-w-lg space-y-6 animate-in slide-in-from-left-8 duration-700 delay-100">
                 <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-sm">
                    {ROMANIAN_FOOTBALL_IMAGES[currentImageIndex].description}
                 </div>
                 <h2 className="text-4xl lg:text-5xl font-black leading-tight drop-shadow-lg">
                    {isLogin ? "Fotbalul românesc în cifre." : "Descoperă viitorul naționalei."}
                 </h2>
                 <p className="text-lg text-blue-100 font-light leading-relaxed drop-shadow-md">
                    Analize detaliate, statistici din SuperLigă și monitorizarea tinerelor talente.
                 </p>
                 
                 {/* Feature list */}
                 <div className="pt-4 flex gap-4 text-sm font-medium text-blue-200">
                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> Liga 1</div>
                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> Liga 2</div>
                    <div className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400" /> Naționala</div>
                 </div>
             </div>

             {/* Footer Stânga + Indicatori Slider */}
             <div className="flex justify-between items-end border-t border-white/20 pt-6">
                <div className="text-xs opacity-60">
                    © 2024 România Fotbal Scout.
                </div>
                {/* Dots pentru slider */}
                <div className="flex gap-2">
                    {ROMANIAN_FOOTBALL_IMAGES.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 bg-yellow-400' : 'w-1.5 bg-white/40'}`}
                        />
                    ))}
                </div>
             </div>
         </div>
      </div>

      {/* --- PARTEA DREAPTĂ: FORMULARUL (Neschimbată funcțional) --- */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-gray-50 dark:bg-slate-900">
        
        {/* Buton Mobile Branding */}
        <div className="absolute top-6 left-6 md:hidden flex flex-col gap-1">
            <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-white">
                <Shield className="w-6 h-6 text-blue-600" /> RO FOTBAL
            </div>
             <div className="h-0.5 w-12 flex">
                    <div className="h-full w-1/3 bg-blue-600"></div>
                    <div className="h-full w-1/3 bg-yellow-400"></div>
                    <div className="h-full w-1/3 bg-red-600"></div>
             </div>
        </div>

        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-in slide-in-from-right-8 duration-700 border border-gray-100 dark:border-slate-700">
            
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                  {isLogin ? 'Autentificare' : 'Scouter Nou'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {isLogin ? 'Bine ai revenit în platformă.' : 'Completează datele pentru a începe scouting-ul.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Nume (Register) */}
                {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nume Complet</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-900 dark:border-slate-600 dark:text-white font-medium"
                            placeholder="Ex: Gică Popescu"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required={!isLogin}
                        />
                    </div>
                </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="email" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-900 dark:border-slate-600 dark:text-white font-medium"
                            placeholder="scout@frf.ro"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <div className="flex justify-between ml-1">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Parolă</label>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="password" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-900 dark:border-slate-600 dark:text-white font-medium"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>
                </div>

                {/* Mesaj Eroare */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-5 h-5" /> {error}
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                    {loading ? 'Se procesează...' : (isLogin ? 'Intră în Vestiar' : 'Semnează Contractul')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            {/* Toggle Link */}
            <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-slate-700">
                <p className="text-gray-500 font-medium text-sm">
                    {isLogin ? 'Vrei să devii scouter?' : 'Ai deja legitimație?'}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="ml-2 font-bold text-blue-600 hover:text-blue-800 transition-colors underline decoration-2 decoration-transparent hover:decoration-blue-600"
                    >
                        {isLogin ? 'Înregistrează-te' : 'Loghează-te'}
                    </button>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}