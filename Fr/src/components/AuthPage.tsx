import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Shield, Star, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 overflow-hidden">
      
      {/* PARTEA STÂNGĂ: IMAGINE CINEMATICĂ */}
      {/* Am schimbat 'hidden lg:flex' în 'hidden md:flex' ca să apară mai des */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900">
         {/* Imaginea de fundal */}
         <div 
            className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-1000"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
         ></div>
         
         {/* Gradient Overlay */}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-900/40 to-black/90"></div>

         {/* Conținut Text pe Imagine */}
         <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white w-full">
             <div className="flex items-center gap-2 font-bold tracking-widest text-sm opacity-90">
                <Shield className="w-5 h-5 text-yellow-400" />
                SCOUT ROMÂNIA
             </div>

             <div className="max-w-lg space-y-6">
                 <h2 className="text-4xl lg:text-5xl font-black leading-tight drop-shadow-lg">
                    {isLogin ? "Bine ai revenit pe teren." : "Începe cariera de scouter."}
                 </h2>
                 <p className="text-lg text-blue-100 font-light leading-relaxed drop-shadow-md">
                    Analize detaliate, statistici avansate și monitorizarea stranierilor. Totul într-o singură platformă dedicată fotbalului românesc.
                 </p>
             </div>

             <div className="text-xs opacity-60 border-t border-white/20 pt-6">
                 © 2024 România Fotbal Scout. Platformă oficială de date.
             </div>
         </div>
      </div>

      {/* PARTEA DREAPTĂ: FORMULARUL */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        
        {/* Buton Mobile de branding (apare doar pe ecrane foarte mici) */}
        <div className="absolute top-6 left-6 md:hidden flex items-center gap-2 font-bold text-blue-900 dark:text-white">
            <Shield className="w-6 h-6 text-blue-600" /> RO FOTBAL
        </div>

        <div className="max-w-md w-full animate-in slide-in-from-right-8 duration-700">
            
            <div className="mb-10">
                <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white mb-3">
                  {isLogin ? 'Autentificare' : 'Creează Cont'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {isLogin ? 'Introdu credențialele pentru acces.' : 'Completează datele pentru a începe.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Nume (Register) */}
                {!isLogin && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nume Complet</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium"
                            placeholder="Ex: Andrei Popescu"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required={!isLogin}
                        />
                    </div>
                </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="email" 
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium"
                            placeholder="nume@exemplu.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            required
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                    <div className="flex justify-between ml-1">
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Parolă</label>
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                            type="password" 
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    </div>
                </div>

                {/* Mesaj Eroare */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl flex items-center justify-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-5 h-5" /> {error}
                    </div>
                )}

                {/* Submit Button */}
                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                    {loading ? 'Se procesează...' : (isLogin ? 'Intră în Cont' : 'Creează Cont')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            {/* Toggle */}
            <div className="mt-8 text-center">
                <p className="text-gray-500 font-medium">
                    {isLogin ? 'Nu ești înregistrat?' : 'Ai deja un cont?'}
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