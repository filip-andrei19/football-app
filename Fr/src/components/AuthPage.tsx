import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, ArrowRight, Star, Activity, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

import stadionImg from '../Photo/stadion.jpg';
import hagiImg from '../Photo/hagi.jpg';
import echipaImg from '../Photo/echipa.jpg';

const BACKGROUND_IMAGES = [stadionImg, hagiImg, echipaImg];
const BACKEND_BASE = (import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';

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
      toast.error('Parolele nu coincid.');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/users/login' : '/api/users/register';

    try {
      const { confirmPassword, ...dataToSend } = formData;
      const response = await fetch(`${BACKEND_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? formData : dataToSend),
      });

      const data = await response.json();

      if (data.success) {
        if (data.token) {
          localStorage.setItem('footballAppToken', data.token);
        }
        toast.success(
          isLogin
            ? `Bine ai revenit, ${data.user.name}.`
            : 'Cont creat cu succes. Bine ai venit!'
        );
        onLoginSuccess(data.user);
      } else {
        toast.error(data.message || 'Autentificare eșuată. Încearcă din nou.');
      }
    } catch {
      toast.error('Eroare de conexiune cu serverul.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMismatch = Boolean(formData.confirmPassword && formData.password !== formData.confirmPassword);

  return (
    <div className="min-h-[100dvh] w-full flex bg-[#F3F5F8] dark:bg-[#090D16] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* --- PARTEA STÂNGĂ: VISUAL STADION (Ascunsă pe mobil) --- */}
      <div className="hidden md:flex md:w-1/2 relative bg-[#090D16] overflow-hidden border-r border-slate-200 dark:border-white/[0.07]">
        {BACKGROUND_IMAGES.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-out ${
              index === currentImageIndex ? 'opacity-40 scale-105' : 'opacity-0 scale-100'
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-[#090D16] via-[#090D16]/65 to-[#090D16]/40" />

        <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14 h-full text-white w-full">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#101726]/80 border border-white/[0.12] backdrop-blur-sm overflow-hidden">
              <span className="text-xs font-bold tracking-tight font-mono-stats">RO</span>
              <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-white leading-tight">
                România Scout
              </span>
              <span className="text-[10px] text-slate-400">Live Hub & Analytics</span>
            </div>
          </div>

          {/* Mesaj principal + Bento highlights */}
          <div className="max-w-md space-y-5 mt-auto mb-10">
            <h2 className="text-3xl lg:text-4xl font-semibold leading-tight tracking-tight text-white">
              {isLogin
                ? 'Analiză și date live pentru fotbalul românesc.'
                : 'Creează un cont de scouter.'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Statistici detaliate, scoruri în timp real și fișe complete de jucători din ligile interne și internaționale.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <div className="p-3 rounded-xl bg-[#101726]/80 border border-white/[0.08] backdrop-blur-sm space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xs font-semibold text-white">Live & Tactică</p>
                <p className="text-[11px] text-slate-400 leading-snug">Scoruri, formații și clasamente live.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#101726]/80 border border-white/[0.08] backdrop-blur-sm space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <p className="text-xs font-semibold text-white">Scouting U21</p>
                <p className="text-[11px] text-slate-400 leading-snug">Radar, filtre avansate și comparații.</p>
              </div>
            </div>
          </div>

          {/* Footer stânga */}
          <div className="flex justify-between items-center pt-5 border-t border-white/10">
            <span className="text-[11px] font-medium text-slate-400 font-mono-stats">
              © 2026 România Scout
            </span>
            <div className="flex gap-1.5">
              {BACKGROUND_IMAGES.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? 'w-6 bg-emerald-500' : 'w-2 bg-white/25'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- PARTEA DREAPTĂ: FORMULAR LOGIN / REGISTER --- */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 min-h-[100dvh] md:min-h-auto">
        <div className="w-full max-w-sm bg-white dark:bg-[#101726] p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          {/* Header formular */}
          <div className="mb-6">
            <div className="flex md:hidden items-center gap-2 mb-5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 dark:bg-[#182235] border border-slate-800 dark:border-white/[0.1] overflow-hidden">
                <span className="text-[11px] font-bold text-white font-mono-stats">RO</span>
                <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500" />
              </div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white">România Scout</span>
            </div>

            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              {isLogin ? 'Autentificare' : 'Creează cont'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isLogin
                ? 'Introdu datele tale pentru a accesa platforma.'
                : 'Completează câmpurile de mai jos pentru înregistrare.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nume complet
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] outline-none transition-colors focus:border-emerald-500 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    placeholder="Ex: Andrei Popescu"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] outline-none transition-colors focus:border-emerald-500 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="nume@exemplu.ro"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Parolă
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] outline-none transition-colors focus:border-emerald-500 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirmă parola
                </label>
                <div className="relative">
                  <CheckCircle2
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      passwordsMismatch ? 'text-rose-500' : 'text-slate-400'
                    }`}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`w-full pl-9 pr-10 py-2.5 rounded-xl border outline-none transition-colors text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      passwordsMismatch
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500'
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] focus:border-emerald-500'
                    }`}
                    placeholder="Repetă parola"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required={!isLogin}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-2 cursor-pointer"
            >
              {loading ? (
                <span>Se procesează...</span>
              ) : (
                <>
                  <span>{isLogin ? 'Continuă' : 'Creează cont'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.07] text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isLogin ? 'Nu ai încă un cont?' : 'Ai deja un cont?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({ ...formData, confirmPassword: '' });
                }}
                className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {isLogin ? 'Înregistrează-te' : 'Autentifică-te'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}