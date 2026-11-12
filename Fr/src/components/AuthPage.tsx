import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, Shield, Star, Activity, CheckCircle, Ticket, Zap, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        toast.error('Parolele nu se potrivesc! (Fault în atac)');
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
        toast.success(isLogin ? `Bine ai revenit la meci, ${data.user.name}!` : 'Transfer realizat cu succes! Bine ai venit!');
        onLoginSuccess(data.user);
      } else {
        toast.error(data.message || 'Gazon impracticabil. Încearcă din nou.');
      }
    } catch (err) {
      toast.error('Problemă de conexiune la stadion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans relative">
      
      {/* Linii de teren pe tot fundalul ecranului (Matchday Texture) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-5 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,#000_40px,#000_42px),repeating-linear-gradient(0deg,transparent,transparent_40px,#000_40px,#000_42px)]"></div>

      {/* --- PARTEA STÂNGĂ: IMAGINI STADION (Ascunsă pe mobil) --- */}
      <div className="hidden md:flex md:w-1/2 relative bg-slate-950 overflow-hidden border-r-4 md:border-r-8 border-emerald-500 shadow-2xl">
         {BACKGROUND_IMAGES.map((img, index) => (
            <div key={index} className={`absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms] ease-linear ${index === currentImageIndex ? 'opacity-70 scale-110' : 'opacity-0 scale-100'}`} style={{ backgroundImage: `url(${img})` }}></div>
         ))}
         
         {/* Gradienți Stadion */}
         <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-emerald-900/40 to-slate-900/80 mix-blend-multiply"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
         
         <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 h-full text-white w-full">
             <div className="flex items-center gap-3 font-black uppercase tracking-widest text-xs lg:text-sm text-emerald-400">
                 <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-400" /> ROMÂNIA SCOUT
             </div>
             
             <div className="max-w-lg space-y-4 lg:space-y-6 animate-in slide-in-from-left-8 duration-700 delay-100 mt-auto mb-10 lg:mb-20">
                 <h2 className="text-4xl lg:text-6xl font-black leading-none drop-shadow-2xl uppercase tracking-tighter">
                     {isLogin ? "Pregătit de" : "Fă Pasul pe"} <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-emerald-400">Teren.</span>
                 </h2>
                 <p className="text-sm lg:text-lg text-slate-300 font-bold leading-relaxed drop-shadow-md border-l-4 border-emerald-500 pl-4 uppercase tracking-widest">
                     Baza oficială de date a fotbalului românesc.
                 </p>
                 <div className="pt-6 lg:pt-8 grid grid-cols-1 gap-3 lg:gap-4">
                    <div className="flex items-center gap-3 lg:gap-4 text-xs lg:text-sm font-black uppercase tracking-widest text-white backdrop-blur-md bg-slate-900/40 p-2 lg:p-3 rounded-xl border border-slate-700/50 w-fit">
                        <div className="bg-emerald-500/20 p-1.5 lg:p-2 rounded-lg border border-emerald-500/50"><Activity className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" /></div>
                        Monitorizare Performanțe
                    </div>
                    <div className="flex items-center gap-3 lg:gap-4 text-xs lg:text-sm font-black uppercase tracking-widest text-white backdrop-blur-md bg-slate-900/40 p-2 lg:p-3 rounded-xl border border-slate-700/50 w-fit">
                        <div className="bg-yellow-500/20 p-1.5 lg:p-2 rounded-lg border border-yellow-500/50"><Star className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" /></div>
                        Scouting Tineri & Stranieri
                    </div>
                 </div>
             </div>

             <div className="flex justify-between items-end pt-6 relative z-10">
                 <div className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-500">© 2026 ROMÂNIA SCOUT</div>
                 <div className="flex gap-2">
                     {BACKGROUND_IMAGES.map((_, idx) => (
                         <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-6 lg:w-8 bg-emerald-500' : 'w-2 bg-slate-700'}`}></div>
                     ))}
                 </div>
             </div>
         </div>
      </div>

      {/* --- PARTEA DREAPTĂ: FORMULAR LOGIN/REGISTER --- */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden z-10 min-h-[100dvh] md:min-h-auto">
        
        {/* Glow dinamic sportiv - Oprit/Redus pe mobil ca să nu creeze overflow */}
        <div className="hidden sm:block absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="hidden sm:block absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none delay-1000"></div>

        <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10 rounded-2xl sm:rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-8 duration-700 border-2 sm:border-4 border-slate-200 dark:border-slate-800 relative z-20">
            
            {/* Element decorativ de "Tabelă / Scanare" */}
            <div className="absolute top-0 right-6 sm:right-8 w-12 sm:w-16 h-1.5 sm:h-2 bg-emerald-500 rounded-b-lg"></div>

            <div className="mb-8 sm:mb-10 text-center">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-800 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 sm:mb-6 shadow-sm">
                    {isLogin ? <User className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500"/> : <Ticket className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500"/>}
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2 sm:mb-3">
                    {isLogin ? 'Acces Baza de Date' : 'Emite Legitimație'}
                </h1>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 px-2">
                    {isLogin ? 'Autentificare scouter oficial.' : 'Înrolare nouă în academia de scouteri.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {!isLogin && (
                <div className="space-y-1 sm:space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Numele Tău (pe tricou)</label>
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-l-lg sm:rounded-l-xl border-r-2 border-slate-200 dark:border-slate-700 group-focus-within:bg-emerald-500 group-focus-within:border-emerald-600 transition-colors">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                        </div>
                        <input type="text" className="w-full pl-12 sm:pl-16 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 font-bold tracking-wide text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" placeholder="Ex: Ion Golea" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required={!isLogin} />
                    </div>
                </div>
                )}
                
                <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Adresă de Contact</label>
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-l-lg sm:rounded-l-xl border-r-2 border-slate-200 dark:border-slate-700 group-focus-within:bg-emerald-500 group-focus-within:border-emerald-600 transition-colors">
                            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                        </div>
                        <input type="email" className="w-full pl-12 sm:pl-16 pr-3 sm:pr-4 py-3 sm:py-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 font-bold tracking-wide text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" placeholder="scout@exemplu.ro" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                    </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Cod Acces (Parolă)</label>
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-l-lg sm:rounded-l-xl border-r-2 border-slate-200 dark:border-slate-700 group-focus-within:bg-emerald-500 group-focus-within:border-emerald-600 transition-colors">
                            <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-focus-within:text-white transition-colors" />
                        </div>
                        <input type={showPassword ? "text" : "password"} className="w-full pl-12 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 font-bold tracking-wide text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors p-1.5 sm:p-2">
                            {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                    </div>
                </div>

                {!isLogin && (
                <div className="space-y-1 sm:space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Confirmare Cod</label>
                    <div className="relative group">
                        <div className={`absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center rounded-l-lg sm:rounded-l-xl border-r-2 transition-colors ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'bg-rose-100 dark:bg-rose-900/50 border-rose-200 dark:border-rose-800' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 group-focus-within:bg-emerald-500 group-focus-within:border-emerald-600'}`}>
                            <CheckCircle className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-white'}`} />
                        </div>
                        <input type={showConfirmPassword ? "text" : "password"} className={`w-full pl-12 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-4 rounded-lg sm:rounded-xl border-2 outline-none transition-all font-bold tracking-wide text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-rose-500 bg-rose-50 dark:bg-rose-950 focus:border-rose-600' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-emerald-500 dark:focus:border-emerald-500'}`} placeholder="Repetă codul" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} required={!isLogin} />
                         <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors p-1.5 sm:p-2">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                    </div>
                </div>
                )}

                {/* Buton Submit */}
                <button type="submit" disabled={loading} className="w-full py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[11px] sm:text-sm rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-70 disabled:hover:translate-y-0 mt-4 sm:mt-6 border-b-4 border-emerald-800 hover:border-b-2 hover:translate-y-[2px] shadow-[0_5px_15px_rgba(16,185,129,0.3)]">
                    {loading ? (
                        <>Fluier de start... <Zap className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" /></>
                    ) : (
                        <>{isLogin ? 'Intră în Vestiar' : 'Aplică pentru Post'} <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" /></>
                    )}
                </button>
            </form>

            <div className="mt-8 sm:mt-10 text-center pt-5 sm:pt-6 border-t-2 border-slate-100 dark:border-slate-800">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                    {isLogin ? 'Nu ești pe foaia de arbitraj?' : 'Ai deja legitimație?'}
                </p>
                <button 
                    onClick={() => { setIsLogin(!isLogin); setFormData({...formData, confirmPassword: ''}); }} 
                    className="mt-2 font-black uppercase tracking-widest text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 hover:text-slate-900 dark:hover:text-white transition-colors border-b-2 border-emerald-600 hover:border-slate-900 dark:hover:border-white pb-1"
                >
                    {isLogin ? 'Transferă-te (Cont Nou)' : 'Mergi la Cabine (Login)'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}