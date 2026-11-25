import React, { useState, useRef } from 'react';
import { User, Lock, Save, Camera, Mail, Shield, Loader2, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_BASE = (import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';

export function ProfileSection({
  user,
  onUpdateUser,
  onLogout,
}: {
  user: any;
  onUpdateUser: (u: any) => void;
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    avatar: user.avatar || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error("Fotografia este prea mare (maxim 5MB).");
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        setFormData((prev) => ({ ...prev, avatar: base64Image }));

        setLoading(true);
        const savingToast = toast.loading("Se actualizează fotografia...");

        try {
          const response = await fetch(`${BACKEND_BASE}/api/users/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: formData.name,
              avatar: base64Image,
            }),
          });

          const data = await response.json();

          if (data.success) {
            onUpdateUser(data.user);
            toast.success("Fotografia de profil a fost salvată.", { id: savingToast });
          } else {
            toast.error(data.error || data.message || "Eroare la salvarea fotografiei.", { id: savingToast });
          }
        } catch {
          toast.error("Eroare de conexiune cu serverul.", { id: savingToast });
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
      const response = await fetch(`${BACKEND_BASE}/api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: formData.name,
          avatar: formData.avatar,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onUpdateUser(data.user);
        toast.success("Profilul a fost actualizat.");
      } else {
        toast.error(data.error || data.message || "Eroare la actualizare.");
      }
    } catch {
      toast.error("Eroare de conexiune.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPassword) {
      return toast.error("Introdu parola curentă.");
    }
    if (formData.newPassword.length < 6) {
      return toast.error("Parola nouă trebuie să aibă minim 6 caractere.");
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error("Parolele noi nu coincid.");
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_BASE}/api/users/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Parola a fost schimbată.");
        setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.message || data.error || "Eroare la schimbarea parolei.");
      }
    } catch {
      toast.error("Eroare de conexiune.");
    } finally {
      setLoading(false);
    }
  };

  const passwordsMismatch = Boolean(formData.confirmPassword && formData.newPassword !== formData.confirmPassword);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-16">
      {/* Header Bento Profil */}
      <div className="bg-white dark:bg-[#101726] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.07] flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
        <div className="relative group cursor-pointer shrink-0" onClick={handleImageClick}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-[#090D16] flex items-center justify-center text-2xl sm:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-white/[0.1] overflow-hidden relative">
            {formData.avatar ? (
              <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white p-1.5 rounded-xl border-2 border-white dark:border-[#101726]">
            <Camera className="w-3.5 h-3.5" />
          </div>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white truncate">
            {user.name}
          </h2>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-slate-500 dark:text-slate-400 text-xs mt-1 truncate">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
            <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-[#090D16] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] text-[11px] font-medium rounded-lg">
              {user.role === 'admin' ? 'Administrator' : 'Membru Scouter'}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium rounded-lg inline-flex items-center gap-1">
              <Shield className="w-3 h-3" /> Cont activ
            </span>
          </div>
        </div>
      </div>

      {/* Formulare */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Meniu stânga */}
        <div className="flex md:flex-col gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors border cursor-pointer ${
              activeTab === 'details'
                ? 'bg-slate-900 dark:bg-[#182235] border-slate-900 dark:border-white/[0.12] text-white'
                : 'bg-white dark:bg-[#101726] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4 shrink-0" /> Date personale
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors border cursor-pointer ${
              activeTab === 'security'
                ? 'bg-slate-900 dark:bg-[#182235] border-slate-900 dark:border-white/[0.12] text-white'
                : 'bg-white dark:bg-[#101726] border-slate-200/80 dark:border-white/[0.07] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" /> Securitate
          </button>

          <div className="hidden md:block pt-3 mt-2 border-t border-slate-200 dark:border-white/[0.07]">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Deconectare
            </button>
          </div>
        </div>

        {/* Conținut formular */}
        <div className="md:col-span-2 bg-white dark:bg-[#101726] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/[0.07]">
          {activeTab === 'details' ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="border-b border-slate-200 dark:border-white/[0.07] pb-3 mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Date personale</h3>
                <p className="text-xs text-slate-500 mt-0.5">Actualizează numele afișat în platformă.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nume afișat
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] focus:border-emerald-500 outline-none text-sm text-slate-900 dark:text-white transition-colors"
                />
                <p className="text-[11px] text-slate-500">Se actualizează automat și pe anunțurile tale din Fanshop.</p>
              </div>

              <div className="space-y-1.5 opacity-70">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-white/[0.03] text-slate-500 cursor-not-allowed text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvează modificările
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="border-b border-slate-200 dark:border-white/[0.07] pb-3 mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Schimbă parola</h3>
                <p className="text-xs text-slate-500 mt-0.5">Alege o parolă de minim 6 caractere.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Parola curentă
                </label>
                <input
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] focus:border-emerald-500 outline-none text-sm text-slate-900 dark:text-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Parola nouă
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Minim 6 caractere"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] focus:border-emerald-500 outline-none text-sm text-slate-900 dark:text-white transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Confirmă parola
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Repetă parola"
                    className={`w-full px-3 py-2.5 rounded-xl border outline-none text-sm text-slate-900 dark:text-white transition-colors ${
                      passwordsMismatch
                        ? 'border-rose-500 bg-rose-500/5 focus:border-rose-500'
                        : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] focus:border-emerald-500'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? 'Se procesează...' : 'Actualizează parola'}
              </button>
            </form>
          )}
        </div>

        {/* Logout mobil */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Deconectare
          </button>
        </div>
      </div>
    </div>
  );
}