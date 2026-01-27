import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, Shield, Star, Activity, Award } from 'lucide-react';

// --- IMPORTĂM IMAGINILE LOCALE ---
// ".. " înseamnă "ieși din folderul components"
// "/Photo" înseamnă "intră în folderul Photo"
import stadionImg from '../Photo/stadion.jpg';
import hagiImg from '../Photo/hagi.jpg';
import echipaImg from '../Photo/echipa.jpg';

// --- FOLOSIM VARIABILELE IMPORTATE ---
const BACKGROUND_IMAGES = [
  stadionImg, // Imaginea 1: Stadion
  hagiImg,    // Imaginea 2: Hagi
  echipaImg   // Imaginea 3: Echipa Națională
];

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State pentru slideshow
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Efect pentru rotirea imaginilor la fiecare 5 secunde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length);
    }, 6000); // Schimbă la fiecare 6 secunde
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
      
      {/* PARTEA STÂNGĂ: SLIDESHOW CINEMATIC (Doar Desktop/Tabletă) */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900 overflow-hidden">
         
         {/* Imaginile de fundal (mapate pentru tranziție smooth) */}
         {BACKGROUND_IMAGES.map((img, index) => (
            <div 
                key={index}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
                    index === currentImageIndex ? 'opacity-60 scale-105' : 'opacity-0 scale-100'
                }`}
                style={{ backgroundImage: `url(${img})` }}
            ></div>
         ))}
         
         {/* Gradient Overlay TRICOLOR (Subtil) */}
         {/* Acesta dă o tentă albăstruie jos și o tentă roșiatică sus, sugerând tricolorul */}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-transparent to-red-900/60 mix-blend-multiply"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

         {/* Conținut Text pe Imagine */}
         <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white w-full">
             <div className="flex items-center gap-2 font-bold tracking-widest text-sm opacity-90">
                <Shield className="w-5 h-5 text-yellow-400" />
                SCOUT ROMÂNIA
             </div>

             <div className="max-w-lg space-y-6 animate-in slide-in-from-left-8 duration-700 delay-100">
                 <h2 className="text-4xl lg:text-5xl font-black leading-tight drop-shadow-lg">
                    {isLogin ? "Fotbalul ne unește." : "Descoperă viitorii campioni."}
                 </h2>
                 <p className="text-lg text-blue-100 font-light leading-relaxed drop-shadow-md">
                    De la juniorii din țară până la stranierii din diaspora. Singura platformă completă de analiză și scouting pentru fotbalul românesc.
                 </p>
                 
                 {/* Feature list */}
                 <div className="pt-6 grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-50 backdrop-blur-sm bg-white/10 p-2 rounded-lg w-fit">
                        <Activity className="w-4 h-4 text-yellow-400" /> 
                        <span>Statistici Live din SuperLigă & Diaspora</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-50 backdrop-blur-sm bg-white/10 p-2 rounded-lg w-fit">
                        <Star className="w-4 h-4 text-yellow-400" /> 
                        <span>Monitorizare Talente U21</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-50 backdrop-blur-sm bg-white/10 p-2 rounded-lg w-fit">
                        <Award className="w-4 h-4 text-yellow-400" /> 
                        <span>Rapoarte Profesionale de Scouting</span>
                    </div>
                 </div>
             </div>

             <div className="flex justify-between items-end border-t border-white/20 pt-6">
                 <div className="text-xs opacity-60">
                     © 2024 România Fotbal Scout.
                 </div>
                 {/* Indicatori Slideshow */}
                 <div className="flex gap-2">
                    {BACKGROUND_IMAGES.map((_, idx) => (
                        <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 bg-yellow-400' : 'w-2 bg-white/30'}`}></div>
                    ))}
                 </div>
             </div>
         </div>
      </div>

      {/* PARTEA DREAPTĂ: FORMULARUL */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-gray-50 dark:bg-slate-900">
        
        {/* Buton Mobile Branding */}
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2 font-bold text-blue-900 dark:text-white">
            <Shield className="w-6 h-6 text-blue-600" /> RO FOTBAL
        </div>

        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl animate-in slide-in-from-right-8 duration-700 border border-gray-100 dark:border-slate-700">
            
            {/* Header Formular */}
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                  {isLogin ? 'Bine ai revenit!' : 'Alătură-te Echipei'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {isLogin ? 'Accesează baza de date a fotbalului românesc.' : 'Creează cont pentru acces complet la statistici.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Nume (Doar la Register) */}
                {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nume Complet</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-900 dark:border-slate-600 dark:text-white font-medium"
                            placeholder="Ex: Gheorghe Hagi"
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
                            placeholder="scout@romania.ro"
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
                    {loading ? 'Se conectează...' : (isLogin ? 'Intră în Cont' : 'Înregistrează-te')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            {/* Toggle Link */}
            <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-slate-700">
                <p className="text-gray-500 font-medium text-sm">
                    {isLogin ? 'Nu ești înregistrat?' : 'Ai deja un cont?'}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="ml-2 font-bold text-blue-600 hover:text-blue-800 transition-colors underline decoration-2 decoration-transparent hover:decoration-blue-600"
                    >
                        {isLogin ? 'Fă-ți cont gratuit' : 'Loghează-te aici'}
                    </button>
                </p>
            </div>

        </div>
      </div>
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}