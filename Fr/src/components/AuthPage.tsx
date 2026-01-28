import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, Shield, Star, Activity, Award, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast'; // <--- IMPORT NOU

import stadionImg from '../Photo/stadion.jpg';
import hagiImg from '../Photo/hagi.jpg';
import echipaImg from '../Photo/echipa.jpg';

const BACKGROUND_IMAGES = [stadionImg, hagiImg, echipaImg];

interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % BACKGROUND_IMAGES.length);
    }, 6000); 
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && formData.password !== formData.confirmPassword) {
        toast.error('Parolele nu coincid!'); // <--- TOAST ÎN LOC DE STATE
        setLoading(false);
        return;
    }

    const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
    
    try {
      const { confirmPassword, ...dataToSend } = formData;
      const response = await fetch(`https://football-backend-m2a4.onrender.com${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? formData : dataToSend)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(isLogin ? `Bine ai revenit, ${data.user.name}!` : 'Cont creat cu succes!');
        onLoginSuccess(data.user);
      } else {
        toast.error(data.message || 'Ceva nu a mers bine.');
      }
    } catch (err) {
      toast.error('Eroare de server. Verifică conexiunea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-900 overflow-hidden font-sans">
      <div className="hidden md:flex md:w-1/2 relative bg-slate-900 overflow-hidden">
         {BACKGROUND_IMAGES.map((img, index) => (
            <div key={index} className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === currentImageIndex ? 'opacity-60 scale-105' : 'opacity-0 scale-100'}`} style={{ backgroundImage: `url(${img})` }}></div>
         ))}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-transparent to-red-900/60 mix-blend-multiply"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
         <div className="relative z-10 flex flex-col justify-between p-12 h-full text-white w-full">
             <div className="flex items-center gap-2 font-bold tracking-widest text-sm opacity-90"><Shield className="w-5 h-5 text-yellow-400" /> SCOUT ROMÂNIA</div>
             <div className="max-w-lg space-y-6 animate-in slide-in-from-left-8 duration-700 delay-100">
                 <h2 className="text-4xl lg:text-5xl font-black leading-tight drop-shadow-lg">{isLogin ? "Fotbalul ne unește." : "Descoperă viitorii campioni."}</h2>
                 <p className="text-lg text-blue-100 font-light leading-relaxed drop-shadow-md">De la juniorii din țară până la stranierii din diaspora.</p>
                 <div className="pt-6 grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-50 backdrop-blur-sm bg-white/10 p-2 rounded-lg w-fit"><Activity className="w-4 h-4 text-yellow-400" /> <span>Statistici Live</span></div>
                    <div className="flex items-center gap-3 text-sm font-medium text-blue-50 backdrop-blur-sm bg-white/10 p-2 rounded-lg w-fit"><Star className="w-4 h-4 text-yellow-400" /> <span>Monitorizare Talente</span></div>
                 </div>
             </div>
             <div className="flex justify-between items-end border-t border-white/20 pt-6">
                 <div className="text-xs opacity-60">© 2024 România Fotbal Scout.</div>
                 <div className="flex gap-2">{BACKGROUND_IMAGES.map((_, idx) => (<div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 bg-yellow-400' : 'w-2 bg-white/30'}`}></div>))}</div>
             </div>
         </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl dark:bg-slate-800/80 p-8 rounded-3xl shadow-2xl shadow-blue-900/10 animate-in slide-in-from-right-8 duration-700 border border-white/50 dark:border-slate-700 relative z-10">
            <div className="mb-8 text-center md:text-left">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">{isLogin ? 'Bine ai revenit!' : 'Alătură-te Echipei'}</h1>
                <p className="text-gray-500 dark:text-gray-400">{isLogin ? 'Accesează baza de date.' : 'Creează cont gratuit.'}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nume Complet</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input type="text" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 outline-none transition-all focus:ring-4 focus:ring-blue-600/10 dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="Ex: Gheorghe Hagi" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required={!isLogin} />
                    </div>
                </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Email</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input type="email" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 outline-none transition-all focus:ring-4 focus:ring-blue-600/10 dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="email@exemplu.ro" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Parolă</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input type="password" className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 outline-none transition-all focus:ring-4 focus:ring-blue-600/10 dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                    </div>
                </div>
                {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Confirmă Parola</label>
                    <div className="relative group">
                        <CheckCircle className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input type="password" className={`w-full pl-12 pr-4 py-3 rounded-xl border ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white/50'} outline-none transition-all focus:ring-4 focus:ring-blue-600/10 dark:bg-slate-900 dark:border-slate-600 dark:text-white`} placeholder="Repetă parola" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required={!isLogin} />
                    </div>
                </div>
                )}

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-2">
                    {loading ? 'Se procesează...' : (isLogin ? 'Intră în Cont' : 'Înregistrează-te')}
                    {!loading && <ArrowRight className="w-5 h-5" />}
                </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-gray-100 dark:border-slate-700">
                <p className="text-gray-500 font-medium text-sm">
                    {isLogin ? 'Nu ești înregistrat?' : 'Ai deja un cont?'}
                    <button onClick={() => { setIsLogin(!isLogin); setFormData({...formData, confirmPassword: ''}); }} className="ml-2 font-bold text-blue-600 hover:text-blue-800 transition-colors underline decoration-2 decoration-transparent hover:decoration-blue-600">
                        {isLogin ? 'Fă-ți cont gratuit' : 'Loghează-te aici'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}