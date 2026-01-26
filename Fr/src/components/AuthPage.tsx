import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Shield, Star } from 'lucide-react';

// Imagine de fundal (Stadion/Fotbal)
const HERO_IMAGE = "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=2830&auto=format&fit=crop";

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex bg-white dark:bg-slate-900 animate-in fade-in duration-700">
      
      {/* PARTEA STÂNGĂ: IMAGINE CINEMATICĂ (Doar pe Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
         {/* Imaginea de fundal */}
         <div 
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
         ></div>
         
         {/* Gradient Overlay peste imagine */}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-transparent to-black/90"></div>

         {/* Text pe imagine */}
         <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white">
             <div className="flex items-center gap-2 font-bold tracking-widest text-sm opacity-80">
                <Star className="w-4 h-4 text-yellow-400" />
                SCOUT ROMÂNIA
             </div>

             <div className="max-w-md space-y-4">
                 <h2 className="text-5xl font-black leading-tight">
                    Descoperă viitorul fotbalului.
                 </h2>
                 <p className="text-lg text-blue-100 font-light">
                    Analize detaliate, statistici în timp real și monitorizarea stranierilor. Totul într-o singură platformă.
                 </p>
             </div>

             <div className="text-xs opacity-50">
                 © 2024 România Fotbal Scout. All rights reserved.
             </div>
         </div>
      </div>

      {/* PARTEA DREAPTĂ: FORMULARUL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="max-w-md w-full">
            
            {/* Logo Mobile (apare doar pe ecrane mici) */}
            <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg mb-4">
                    <Shield className="w-6 h-6" />
                </div>
            </div>

            <div className="text-center lg:text-left mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {isLogin ? 'Bine ai revenit!' : 'Creează un cont'}
                </h1>
                <p className="text-gray-500">
                  {isLogin ? 'Introdu datele pentru a continua.' : 'Începe călătoria ta de scouting azi.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Nume (Register) */}
                {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nume Complet</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="Ex: Andrei Popescu"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required={!isLogin}
                        />
                    </div>
                </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="email" 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="nume@exemplu.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <div className="flex justify-between">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Parolă</label>
                        {isLogin && <a href="#" className="text-sm text-blue-600 hover:underline">Ai uitat parola?</a>}
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>
                </div>

                {/* Mesaj Eroare */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center justify-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Se încarcă...' : (isLogin ? 'Autentificare' : 'Creează Cont')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            {/* Toggle */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 text-center">
                <p className="text-gray-500 text-sm">
                    {isLogin ? 'Nu ești înregistrat?' : 'Ai deja un cont?'}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="ml-2 font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        {isLogin ? 'Fă-ți cont acum' : 'Loghează-te'}
                    </button>
                </p>
            </div>

        </div>
      </div>

    </div>
  );
}

// Iconiță extra pentru eroare (dacă nu o ai importată)
function AlertCircle({ className }: { className?: string }) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
}