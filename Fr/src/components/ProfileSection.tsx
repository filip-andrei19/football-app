import React, { useState, useRef } from 'react';
import { User, Lock, Save, Camera, Mail, Shield, Loader2, LogOut, Ticket } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfileSection({ user, onUpdateUser, onLogout }: { user: any, onUpdateUser: (u: any) => void, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
      name: user.name,
      email: user.email,
      avatar: user.avatar || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
  });

  const handleImageClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              return toast.error("Fotografie prea mare! (Max 5MB)");
          }

          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64Image = reader.result as string;
              
              setFormData(prev => ({ ...prev, avatar: base64Image }));
              
              setLoading(true);
              const savingToast = toast.loading("Actualizăm legitimația...");
              
              try {
                  const response = await fetch('https://football-backend-m2a4.onrender.com/api/users/profile', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          email: user.email,
                          name: formData.name, 
                          avatar: base64Image
                      })
                  });

                  const data = await response.json();

                  if (data.success) {
                      onUpdateUser(data.user); 
                      toast.success("Fotografie oficială salvată!", { id: savingToast });
                  } else {
                      toast.error(data.error || data.message || "Eroare la salvarea pozei.", { id: savingToast });
                  }
              } catch (err) {
                  toast.error("Eroare la cabine (Server).", { id: savingToast });
              } finally {
                  setLoading(false);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
          const response = await fetch('https://football-backend-m2a4.onrender.com/api/users/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: user.email,
                  name: formData.name,
                  avatar: formData.avatar
              })
          });

          const data = await response.json();

          if (data.success) {
              onUpdateUser(data.user); 
              toast.success("Fișă actualizată! Numele nou apare și pe echipament.");
          } else {
              toast.error(data.error || data.message || "Eroare la actualizare.");
          }
      } catch (err) {
          toast.error("Probleme cu rețeaua stadionului.");
      } finally {
          setLoading(false);
      }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.currentPassword) {
          return toast.error("Introdu codul de acces curent!");
      }
      if (formData.newPassword.length < 6) {
          return toast.error("Noul cod trebuie să aibă minim 6 caractere!");
      }
      if (formData.newPassword !== formData.confirmPassword) {
          return toast.error("Codurile noi nu se potrivesc!");
      }
      
      setLoading(true);
      try {
          const response = await fetch('https://football-backend-m2a4.onrender.com/api/users/change-password', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email: user.email,
                  currentPassword: formData.currentPassword,
                  newPassword: formData.newPassword
              })
          });
          
          const data = await response.json();
          if(data.success) {
              toast.success("Cod de acces schimbat cu succes!");
              setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
          } else {
              toast.error(data.message || data.error || "Eroare la schimbarea parolei.");
          }
      } catch (err) {
          toast.error("Eroare server.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-24 sm:pb-20 relative px-2 sm:px-4 mt-2 sm:mt-4">
        
        {/* FUNDAL SPORTIV */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-3xl opacity-[0.03] dark:opacity-[0.05]">
           <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_40px,#000_40px,#000_42px)]"></div>
        </div>

        {/* --- HEADER PROFIL (Stil Legitimație) --- */}
        <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-10 shadow-xl border-b-4 border-blue-600 flex flex-col md:flex-row items-center gap-5 sm:gap-10 relative overflow-hidden text-center md:text-left">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.8),transparent_60%)] pointer-events-none"></div>
            
            <div className="relative group cursor-pointer z-10 shrink-0" onClick={handleImageClick}>
                <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-xl sm:rounded-2xl bg-slate-800 flex items-center justify-center text-3xl sm:text-5xl font-black text-blue-500 border-2 sm:border-4 border-slate-700 group-hover:border-blue-500 transition-colors shadow-2xl overflow-hidden relative">
                    {formData.avatar ? (
                        <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        user.name.charAt(0).toUpperCase()
                    )}
                    <div className="absolute inset-0 bg-blue-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                </div>
                
                <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 bg-blue-600 text-white p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-lg border-2 border-slate-900 group-hover:scale-110 transition-all">
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 font-bold" />
                </div>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                />
            </div>

            <div className="z-10 flex-1 min-w-0 w-full">
                <div className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 sm:px-3 py-1 rounded-md border border-slate-700 mb-2 sm:mb-3">
                    <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500"/> Legitimație Oficială
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-1 sm:mb-2 truncate drop-shadow-md">
                    {user.name}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-slate-400 text-[10px] sm:text-sm font-bold uppercase tracking-widest mb-3 sm:mb-4 truncate">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" /> <span className="truncate">{user.email}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center md:justify-start">
                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-blue-900/30 text-blue-400 border border-blue-800 text-[9px] sm:text-[10px] font-black rounded-md sm:rounded-lg uppercase tracking-widest">
                        {user.role === 'admin' ? 'Președinte Club' : 'Scouter Principal'}
                    </span>
                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 text-[9px] sm:text-[10px] font-black rounded-md sm:rounded-lg uppercase tracking-widest flex items-center gap-1">
                        <Shield className="w-3 h-3"/> Verificat
                    </span>
                </div>
            </div>
        </div>

        {/* --- FORMULARE (SETĂRI) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            
            {/* Sidebar Meniu - Orizontal pe mobil, vertical pe desktop */}
            <div className="col-span-1 flex md:flex-col gap-2">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all border-2 ${
                        activeTab === 'details' 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-blue-500/50 hover:text-blue-500'
                    }`}
                >
                    <User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Fișa Jucător</span>
                </button>
                <button 
                    onClick={() => setActiveTab('security')}
                    className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all border-2 ${
                        activeTab === 'security' 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-blue-500/50 hover:text-blue-500'
                    }`}
                >
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Acces Vestiar</span>
                </button>

                <div className="hidden md:block pt-4 mt-4">
                    <button 
                        onClick={onLogout} 
                        className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-500 transition-all"
                    >
                        <LogOut className="w-5 h-5" /> Părăsește Terenul
                    </button>
                </div>
            </div>

            {/* Zona Formulare */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl border-2 border-slate-200 dark:border-slate-800">
                {activeTab === 'details' ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-6">
                            <div className="bg-blue-100 dark:bg-blue-900/40 p-1.5 sm:p-2 rounded-lg"><User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400"/></div>
                            <h3 className="text-base sm:text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Date Personale</h3>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1.5">Nume (Pe Tricou)</label>
                            <input 
                                type="text" 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 bg-white focus:border-blue-500 outline-none font-bold uppercase tracking-tight text-xs sm:text-sm text-slate-900 dark:text-white transition-colors"
                            />
                            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1.5 sm:mt-2">* Se reflectă pe toate anunțurile de transfer.</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800 opacity-70">
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Adresă Contact</label>
                            <input 
                                type="email" 
                                value={formData.email} 
                                disabled 
                                className="w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed font-bold uppercase tracking-wide text-xs sm:text-sm truncate"
                            />
                        </div>

                        <button disabled={loading} className="w-full bg-blue-600 text-white px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm hover:bg-blue-500 border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50">
                            {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />}
                            Actualizează Fișa
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-2 sm:gap-3 border-b-2 border-slate-100 dark:border-slate-800 pb-3 sm:pb-4 mb-4 sm:mb-6">
                            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 sm:p-2 rounded-lg"><Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400"/></div>
                            <h3 className="text-base sm:text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Securitate</h3>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                            <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Cod Curent</label>
                            <input 
                                type="password" 
                                value={formData.currentPassword}
                                onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                                placeholder="••••••••"
                                className="w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 bg-white focus:border-emerald-500 outline-none font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors tracking-widest"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1.5">Cod Nou</label>
                                <input 
                                    type="password" 
                                    value={formData.newPassword}
                                    onChange={e => setFormData({...formData, newPassword: e.target.value})}
                                    placeholder="MINIM 6 CARACTERE"
                                    className="w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 bg-white focus:border-blue-500 outline-none font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors tracking-widest placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:text-[10px]"
                                />
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950 p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                                <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500 mb-1.5">Confirmă Cod</label>
                                <input 
                                    type="password" 
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                    placeholder="REPETĂ CODUL"
                                    className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 outline-none font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors tracking-widest placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:text-[10px] ${formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-200 dark:border-slate-700 dark:bg-slate-900 bg-white focus:border-blue-500'}`}
                                />
                            </div>
                        </div>
                        
                        <button disabled={loading} className="w-full bg-slate-900 dark:bg-slate-700 text-white px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-xs sm:text-sm hover:bg-slate-800 dark:hover:bg-slate-600 border-b-4 border-slate-950 dark:border-slate-900 hover:border-b-2 hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50">
                             {loading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"/> : <Lock className="w-4 h-4 sm:w-5 sm:h-5"/>}
                             {loading ? 'Se procesează...' : 'Setează Noul Cod'}
                        </button>
                    </form>
                )}
            </div>

            {/* Buton de logout vizibil jos pe mobil */}
            <div className="md:hidden pt-2">
                <button 
                    onClick={onLogout} 
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs bg-rose-50 dark:bg-rose-900/10 border-2 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                >
                    <LogOut className="w-4 h-4" /> Părăsește Terenul
                </button>
            </div>
        </div>
    </div>
  );
}