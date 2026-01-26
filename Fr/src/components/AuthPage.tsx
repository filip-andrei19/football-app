import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Shield } from 'lucide-react';

// Definim ce props primește componenta
interface AuthPageProps {
  onLoginSuccess: (user: any) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true); // true = Login, false = Register
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
        // Dacă e succes, trimitem datele utilizatorului către App.js
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700">
        
        {/* HEADER: Gradient Tricolor */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-yellow-500 to-red-600"></div>
        
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4 shadow-sm border border-blue-100">
               <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
              {isLogin ? 'Bine ai revenit!' : 'Alătură-te Echipei'}
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Scouting, Statistici și Diaspora Tricoloră
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Nume (Doar la Register - apare condiționat) */}
            {!isLogin && (
              <div className="relative animate-in slide-in-from-top-2 duration-300">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Numele tău"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-gray-400"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required={!isLogin} // Required doar dacă nu e login
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="email" 
                placeholder="Adresa de email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-gray-400"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="password" 
                placeholder="Parola"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all dark:bg-slate-700 dark:border-slate-600 dark:text-white placeholder:text-gray-400"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            {/* Mesaj Eroare */}
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 border border-red-100 py-2 rounded-lg animate-in fade-in">
                {error}
              </div>
            )}

            {/* Buton Submit */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Se procesează...' : (isLogin ? 'Intră în cont' : 'Creează cont')}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isLogin ? 'Nu ai cont încă?' : 'Ai deja un cont?'}
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(''); }} // Resetăm eroarea la schimbare
                className="ml-2 font-bold text-blue-600 hover:underline hover:text-blue-700 transition-colors"
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