import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, Users, Newspaper, Ban, Search, Plus, Trash2,
  ShoppingBag, X, Save, Edit, Flag, AlertTriangle, Shirt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from '@tanstack/react-form';

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  avatar?: string;
  strikes?: number;
}

interface ListingData {
  _id: string;
  title: string;
  category: string;
  price: string;
  seller: string;
  sellerEmail: string;
  images: string[];
  posted: string;
  reportedBy?: string[];
}

interface StoryData {
  _id: string;
  title: string;
  role: string;
  organization: string;
  excerpt: string;
  content: string;
  date: string;
  postedAt: string;
}

interface ReportedMessage {
  _id: string;
  author: string;
  message: string;
  imageUrl?: string;
  room: string;
  reportedBy: string[];
  timestamp: string;
}

interface XIPlayer {
  _id?: string;
  id?: string;
  name: string;
  gridRow: number;
}

interface StartingXIData {
  _id?: string;
  id?: string;
  teamName: string;
  opponent: string;
  date: string;
  score: string;
  formation: string;
  teamColor?: string;
  opponentColor?: string;
  isHome?: boolean;
  players: XIPlayer[];
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://football-backend-m2a4.onrender.com");
const API_URL = `${API_BASE}/api`;

const getContrastTextColor = (hexColor: string) => {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0f172a' : '#ffffff';
};

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'news' | 'reports' | 'xi'>('users');

  const [users, setUsers] = useState<UserData[]>([]);
  const [listings, setListings] = useState<ListingData[]>([]);
  const [stories, setStories] = useState<StoryData[]>([]);
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [reportedListings, setReportedListings] = useState<ListingData[]>([]);

  const [xis, setXis] = useState<StartingXIData[]>([]);
  const [editingXiId, setEditingXiId] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");
  const [opponent, setOpponent] = useState("");
  const [score, setScore] = useState("");
  const [date, setDate] = useState("");
  const [formation, setFormation] = useState("4-3-3");
  const [teamColor, setTeamColor] = useState("#3b82f6");
  const [opponentColor, setOpponentColor] = useState("#ef4444");
  const [isHome, setIsHome] = useState(true);
  const [slotPlayers, setSlotPlayers] = useState<(XIPlayer | null)[]>(Array(11).fill(null));

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showStoryModal, setShowStoryModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const storyForm = useForm({
    defaultValues: {
      title: '',
      role: '',
      organization: '',
      excerpt: '',
      content: '',
      date: ''
    },
    onSubmit: async ({ value }) => {
      try {
        let res;
        if (editingId) {
          res = await fetch(`${API_URL}/admin/stories/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value)
          });
        } else {
          res = await fetch(`${API_URL}/admin/stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value)
          });
        }

        if (res.ok) {
          const savedStory = await res.json();
          if (editingId) {
            setStories(prev => prev.map(s => (s._id === editingId ? savedStory : s)));
            toast.success("Articol actualizat.");
          } else {
            setStories([savedStory, ...stories]);
            toast.success("Articol adăugat.");
          }
          setShowStoryModal(false);
          storyForm.reset();
        } else {
          toast.error("A apărut o problemă la salvarea datelor.");
        }
      } catch {
        toast.error("Eroare de conexiune la salvare.");
      }
    }
  });

  const { isSubmitting, canSubmit } = storyForm.state;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const resUsers = await fetch(`${API_URL}/admin/users`);
      if (resUsers.ok) setUsers(await resUsers.json());

      const resListings = await fetch(`${API_URL}/listings`);
      if (resListings.ok) setListings(await resListings.json());

      const resStories = await fetch(`${API_URL}/stories`);
      if (resStories.ok) setStories(await resStories.json());

      const resReports = await fetch(`${API_URL}/admin/reported-messages`);
      if (resReports.ok) setReportedMessages(await resReports.json());

      const resRepListings = await fetch(`${API_URL}/admin/reported-listings`);
      if (resRepListings.ok) setReportedListings(await resRepListings.json());

      const resXi = await fetch(`${API_URL}/sport/starting-xi`);
      if (resXi.ok) {
        setXis(await resXi.json());
      }
    } catch {
      toast.error("Eroare la încărcarea datelor din baza de date.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (id: string, currentStatus: boolean, name: string) => {
    if (!window.confirm(`Schimbi statusul pentru ${name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => (u._id === id ? { ...u, isBanned: !u.isBanned } : u)));
        toast.success("Status actualizat.");
      }
    } catch {
      toast.error("Eroare server.");
    }
  };

  const handleDeleteListing = async (id: string, title: string) => {
    if (!window.confirm(`Ștergi anunțul "${title}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        setListings(prev => prev.filter(l => l._id !== id));
        setReportedListings(prev => prev.filter(l => l._id !== id));
        toast.success("Anunț șters.");
      }
    } catch {
      toast.error("Eroare server.");
    }
  };

  const handleAddStrike = async (authorName: string) => {
    if (!window.confirm(`Adaugi o abatere permanentă pentru ${authorName}?`)) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/strike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authorName })
      });
      if (res.ok) {
        toast.success(`Abatere adăugată pentru ${authorName}.`);
        fetchInitialData();
      }
    } catch {
      toast.error("Eroare la adăugarea abaterii.");
    }
  };

  const handleDeleteReportedMessage = async (id: string) => {
    if (!window.confirm("Ștergi definitiv acest mesaj?")) return;
    try {
      const res = await fetch(`${API_URL}/messages/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user.name, userRole: user.role, email: user.email })
      });
      if (res.ok) {
        setReportedMessages(prev => prev.filter(m => m._id !== id));
        toast.success("Mesaj șters.");
      }
    } catch {
      toast.error("Eroare la ștergerea mesajului.");
    }
  };

  const handleDismissReport = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/messages/${id}/dismiss-report`, { method: 'POST' });
      if (res.ok) {
        setReportedMessages(prev => prev.filter(m => m._id !== id));
        toast.success("Raport ignorat.");
      }
    } catch {
      toast.error("Eroare la procesare.");
    }
  };

  const handleDismissListingReport = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/listings/${id}/dismiss-report`, { method: 'POST' });
      if (res.ok) {
        setReportedListings(prev => prev.filter(l => l._id !== id));
        toast.success("Raport ignorat.");
      }
    } catch {
      toast.error("Eroare la procesare.");
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    storyForm.reset();
    setShowStoryModal(true);
  };

  const openEditModal = (story: StoryData) => {
    setEditingId(story._id);
    storyForm.setFieldValue('title', story.title);
    storyForm.setFieldValue('role', story.role);
    storyForm.setFieldValue('organization', story.organization);
    storyForm.setFieldValue('excerpt', story.excerpt);
    storyForm.setFieldValue('content', story.content);
    storyForm.setFieldValue('date', story.date);
    setShowStoryModal(true);
  };

  const handleDeleteStory = async (id: string) => {
    if (!window.confirm("Ștergi acest articol din arhivă?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/stories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStories(prev => prev.filter(s => s._id !== id));
        toast.success("Articol șters.");
      }
    } catch {
      toast.error("Eroare.");
    }
  };

  const getGridRowForSlot = (index: number, form: string) => {
    if (index === 0) return 0;
    const parts = form.split('-').map(Number);
    let sum = 0;
    for (let r = 0; r < parts.length; r++) {
      sum += parts[r];
      if (index <= sum) return r + 1;
    }
    return 1;
  };

  const getSlotLabel = (index: number, form: string) => {
    if (index === 0) return "GK (Portar)";
    const row = getGridRowForSlot(index, form);
    const parts = form.split('-').length;

    if (parts === 3) {
      if (row === 1) return `DEF ${index}`;
      if (row === 2) return `MID ${index}`;
      if (row === 3) return `ATT ${index}`;
    }
    if (parts === 4) {
      if (row === 1) return `DEF ${index}`;
      if (row === 2) return `CDM/MID ${index}`;
      if (row === 3) return `CAM/MID ${index}`;
      if (row === 4) return `ATT ${index}`;
    }
    if (parts === 5) {
      if (row === 1) return `DEF ${index}`;
      if (row === 2) return `CDM ${index}`;
      if (row === 3) return `MID ${index}`;
      if (row === 4) return `CAM ${index}`;
      if (row === 5) return `ATT ${index}`;
    }
    return `Jucător ${index}`;
  };

  const resetXiForm = () => {
    setEditingXiId(null);
    setTeamName("");
    setOpponent("");
    setScore("");
    setDate("");
    setTeamColor("#3b82f6");
    setOpponentColor("#ef4444");
    setIsHome(true);
    setFormation("4-3-3");
    setSlotPlayers(Array(11).fill(null));
  };

  const handleEditXI = (match: StartingXIData) => {
    const validId = match._id || match.id;
    if (!validId) {
      toast.error("Meciul nu are un ID valid.");
      return;
    }
    setEditingXiId(validId);
    setTeamName(match.teamName || "");
    setOpponent(match.opponent || "");
    setScore(match.score || "");
    setDate(match.date || "");
    setFormation(match.formation || "4-3-3");
    setTeamColor(match.teamColor || "#3b82f6");
    setOpponentColor(match.opponentColor || "#ef4444");
    setIsHome(match.isHome !== false);

    const newSlots = Array(11).fill(null);
    if (match.players && Array.isArray(match.players)) {
      match.players.forEach((p, idx) => {
        if (idx < 11) newSlots[idx] = p;
      });
    }
    setSlotPlayers(newSlots);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveXI = async () => {
    if (!teamName || !opponent || !score || !date) {
      toast.error("Completează toate detaliile meciului.");
      return;
    }

    const isValid = slotPlayers.every(p => p !== null && p.name.trim().length > 0);
    if (!isValid) {
      toast.error("Completează numele pentru toți cei 11 jucători.");
      return;
    }

    const cleanPlayers = slotPlayers.map(p => ({
      name: p!.name,
      gridRow: p!.gridRow
    }));

    const newXI = {
      teamName,
      opponent,
      score,
      date,
      formation,
      teamColor,
      opponentColor,
      isHome,
      players: cleanPlayers
    };

    try {
      if (editingXiId) {
        const deleteRes = await fetch(`${API_URL}/sport/starting-xi/${editingXiId}`, {
          method: 'DELETE'
        });

        if (!deleteRes.ok) {
          toast.error("Eroare la actualizarea meciului vechi.");
          return;
        }
        setXis(prev => prev.filter(x => (x._id || x.id) !== editingXiId));
      }

      const postRes = await fetch(`${API_URL}/sport/starting-xi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newXI)
      });

      if (postRes.ok) {
        const savedXI = await postRes.json();
        setXis(prev => [...prev, savedXI]);
        toast.success(editingXiId ? "Meci actualizat." : "Meci salvat.");
        resetXiForm();
      } else {
        let errorMsg = `Eroare ${postRes.status}: ${postRes.statusText}`;
        try {
          const errData = await postRes.json();
          errorMsg = errData.error || errData.message || errorMsg;
        } catch {}
        toast.error(errorMsg);
      }
    } catch {
      toast.error("Eroare de rețea. Verifică conexiunea.");
    }
  };

  const handleDeleteXI = async (id: string) => {
    if (window.confirm("Ești sigur că vrei să ștergi acest meci?")) {
      try {
        const res = await fetch(`${API_URL}/sport/starting-xi/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setXis(xis.filter(x => (x._id || x.id) !== id));
          if (editingXiId === id) resetXiForm();
          toast.success("Meci șters.");
        } else {
          toast.error("Problemă la ștergere.");
        }
      } catch {
        toast.error("Eroare conexiune DB.");
      }
    }
  };

  const filteredUsers = users.filter(
    u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredListings = listings.filter(
    l => l.title.toLowerCase().includes(searchTerm.toLowerCase()) || l.seller.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredStories = stories.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalReports = reportedMessages.length + reportedListings.length;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">
      {/* Header Bento Admin */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#101726] border border-slate-200/80 dark:border-white/[0.07] p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-tight">
              Panou Administrare
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Moderare utilizatori, anunțuri, articole și meciuri Primul 11.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 w-full md:w-auto font-mono-stats">
          <div className="bg-slate-50 dark:bg-[#090D16] px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.07] text-center">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{users.length}</div>
            <div className="text-[10px] font-sans text-slate-500">Useri</div>
          </div>
          <div className="bg-slate-50 dark:bg-[#090D16] px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.07] text-center">
            <div className="text-sm font-semibold text-cyan-500">{listings.length}</div>
            <div className="text-[10px] font-sans text-slate-500">Anunțuri</div>
          </div>
          <div className="bg-slate-50 dark:bg-[#090D16] px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.07] text-center">
            <div className="text-sm font-semibold text-emerald-500">{stories.length}</div>
            <div className="text-[10px] font-sans text-slate-500">Articole</div>
          </div>
          <div className={`px-3 py-2 rounded-xl border text-center ${
            totalReports > 0
              ? 'bg-rose-500/10 border-rose-500/25'
              : 'bg-slate-50 dark:bg-[#090D16] border-slate-200/80 dark:border-white/[0.07]'
          }`}>
            <div className={`text-sm font-semibold ${totalReports > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
              {totalReports}
            </div>
            <div className="text-[10px] font-sans text-slate-500">Raportări</div>
          </div>
        </div>
      </div>

      {/* Tab-uri */}
      <div className="flex gap-1 overflow-x-auto bg-slate-200/70 dark:bg-[#101726] p-1 rounded-xl border border-slate-200/80 dark:border-white/[0.07] scrollbar-hide">
        {[
          { id: 'users', label: 'Utilizatori', icon: Users },
          { id: 'listings', label: 'Fanshop', icon: ShoppingBag },
          { id: 'news', label: 'Articole', icon: Newspaper },
          { id: 'reports', label: `Raportări (${totalReports})`, icon: AlertTriangle },
          { id: 'xi', label: 'Primul 11', icon: Shirt }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 md:flex-none px-3.5 py-2 font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap text-xs cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-[#182235] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${tab.id === 'reports' && totalReports > 0 && !isActive ? 'text-rose-500' : ''}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conținut */}
      <div className="bg-white dark:bg-[#101726] rounded-2xl border border-slate-200/80 dark:border-white/[0.07] p-4 sm:p-5 min-h-[460px]">
        {activeTab !== 'reports' && activeTab !== 'xi' && (
          <div className="relative bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] focus-within:border-emerald-500/60 rounded-xl flex items-center mb-4 transition-colors">
            <Search className="text-slate-400 w-4 h-4 ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Caută..."
              className="w-full py-2.5 px-2.5 bg-transparent outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1.5 mr-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-500">Se încarcă datele...</p>
          </div>
        ) : (
          <>
            {/* 1. USERS TAB */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.07] rounded-xl">
                <table className="w-full text-left text-xs sm:text-[13px] min-w-[480px]">
                  <thead className="bg-slate-50 dark:bg-[#090D16] text-slate-500 dark:text-slate-400 font-medium text-[11px] border-b border-slate-200 dark:border-white/[0.07]">
                    <tr>
                      <th className="py-2.5 px-3">Utilizator</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Email</th>
                      <th className="py-2.5 px-3 text-center">Abateri</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Acțiune</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {filteredUsers.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#090D16] flex items-center justify-center font-semibold text-slate-600 dark:text-slate-300 overflow-hidden shrink-0 text-xs">
                              {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : u.name[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{u.name}</div>
                              <div className="text-[11px] text-slate-500 md:hidden truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">{u.email}</td>
                        <td className="py-2.5 px-3 text-center font-mono-stats">
                          <span className={`inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md text-xs font-semibold ${
                            u.strikes && u.strikes > 0
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                              : 'bg-slate-100 dark:bg-[#090D16] text-slate-400'
                          }`}>
                            {u.strikes || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {u.isBanned ? (
                            <span className="text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md text-[11px] font-medium">
                              Blocat
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[11px] font-medium">
                              Activ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {u.email !== user.email && (
                            <button
                              onClick={() => handleToggleBan(u._id, u.isBanned, u.name)}
                              title={u.isBanned ? "Deblochează" : "Blochează"}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. LISTINGS TAB */}
            {activeTab === 'listings' && (
              <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.07] rounded-xl">
                <table className="w-full text-left text-xs sm:text-[13px] min-w-[460px]">
                  <thead className="bg-slate-50 dark:bg-[#090D16] text-slate-500 dark:text-slate-400 font-medium text-[11px] border-b border-slate-200 dark:border-white/[0.07]">
                    <tr>
                      <th className="py-2.5 px-3">Articol</th>
                      <th className="py-2.5 px-3">Preț</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Vânzător</th>
                      <th className="py-2.5 px-3 text-right">Șterge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {filteredListings.map(l => (
                      <tr key={l._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">{l.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{l.category}</div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400 font-mono-stats">{l.price}</td>
                        <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{l.seller}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteListing(l._id, l.title)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#090D16] text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. NEWS / HEROES TAB */}
            {activeTab === 'news' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.07]">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Articole Legende</h3>
                  <button
                    onClick={openAddModal}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adaugă articol
                  </button>
                </div>

                <div className="space-y-2.5">
                  {filteredStories.map(story => (
                    <div
                      key={story._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-[#090D16] p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.07] gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{story.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{story.excerpt}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-medium">
                            {story.role}
                          </span>
                          <span className="bg-slate-200/70 dark:bg-[#101726] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                            {story.organization}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditModal(story)}
                          className="p-2 bg-white dark:bg-[#101726] rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story._id)}
                          className="p-2 bg-white dark:bg-[#101726] rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. TAB RAPORTĂRI */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-white mb-3">
                    <Flag className="text-amber-500 w-4 h-4" /> Mesaje raportate ({reportedMessages.length})
                  </h3>

                  {reportedMessages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 dark:bg-[#090D16] rounded-xl border border-slate-200 dark:border-white/[0.07]">
                      Niciun mesaj raportat momentan.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reportedMessages.map(msg => (
                        <div
                          key={msg._id}
                          className="bg-rose-500/[0.04] p-4 rounded-xl border border-rose-500/20 flex flex-col lg:flex-row justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md font-medium">
                                {msg.room === 'general_chat' ? 'Chat General' : 'Privat'}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white">{msg.author}</span>
                              <span className="text-amber-500 font-medium font-mono-stats">• {msg.reportedBy.length} raportări</span>
                            </div>

                            <div className="p-3 bg-white dark:bg-[#090D16] rounded-xl border border-slate-200 dark:border-white/[0.07]">
                              {msg.message && <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{msg.message}</p>}
                              {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="Raportat" className="mt-2 max-w-[220px] max-h-40 rounded-lg object-cover border border-slate-200 dark:border-white/[0.08]" />
                              )}
                            </div>
                          </div>

                          <div className="flex flex-row lg:flex-col gap-2 justify-center shrink-0">
                            <button
                              onClick={() => handleAddStrike(msg.author)}
                              className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-medium text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                            >
                              Abatere (+1)
                            </button>
                            <button
                              onClick={() => handleDismissReport(msg._id)}
                              className="flex-1 bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 font-medium text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                            >
                              Ignoră
                            </button>
                            <button
                              onClick={() => handleDeleteReportedMessage(msg._id)}
                              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                            >
                              Șterge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-5 border-t border-slate-200 dark:border-white/[0.07]">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-white mb-3">
                    <ShoppingBag className="text-cyan-500 w-4 h-4" /> Anunțuri raportate ({reportedListings.length})
                  </h3>

                  {reportedListings.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 dark:bg-[#090D16] rounded-xl border border-slate-200 dark:border-white/[0.07]">
                      Niciun anunț raportat momentan.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reportedListings.map(listing => (
                        <div
                          key={listing._id}
                          className="bg-cyan-500/[0.04] p-4 rounded-xl border border-cyan-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 dark:text-white">{listing.title}</div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Vânzător: {listing.seller} • <span className="text-amber-500 font-medium font-mono-stats">{listing.reportedBy?.length || 0} raportări</span>
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                            <button
                              onClick={() => handleDismissListingReport(listing._id)}
                              className="flex-1 sm:flex-none bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 font-medium text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                            >
                              Ignoră
                            </button>
                            <button
                              onClick={() => handleDeleteListing(listing._id, listing.title)}
                              className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
                            >
                              Șterge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. TAB PRIMUL 11 (ADMIN) */}
            {activeTab === 'xi' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Formular Adăugare / Editare */}
                <div className="bg-slate-50 dark:bg-[#090D16] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/[0.07] pb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {editingXiId ? 'Editează meci' : 'Adaugă meci nou'}
                    </h3>
                    {editingXiId && (
                      <button
                        onClick={resetXiForm}
                        className="text-xs text-rose-500 hover:underline font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Anulează
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Echipa analizată"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] px-3 py-2 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Adversar"
                      value={opponent}
                      onChange={e => setOpponent(e.target.value)}
                      className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] px-3 py-2 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      placeholder="Scor (ex: 2-1)"
                      value={score}
                      onChange={e => setScore(e.target.value)}
                      className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] px-3 py-2 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500 font-mono-stats"
                    />
                    <input
                      type="text"
                      placeholder="Data / An"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] px-3 py-2 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500 font-mono-stats"
                    />
                  </div>

                  <select
                    value={formation}
                    onChange={e => {
                      setFormation(e.target.value);
                      setSlotPlayers(Array(11).fill(null));
                    }}
                    className="w-full bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] px-3 py-2 rounded-xl text-slate-900 dark:text-white font-medium text-xs outline-none cursor-pointer font-mono-stats"
                  >
                    <option value="4-3-3">4-3-3</option>
                    <option value="4-4-2">4-4-2</option>
                    <option value="4-2-3-1">4-2-3-1</option>
                    <option value="4-1-4-1">4-1-4-1</option>
                    <option value="4-5-1">4-5-1</option>
                    <option value="4-4-1-1">4-4-1-1</option>
                    <option value="4-3-2-1">4-3-2-1</option>
                    <option value="4-1-2-1-2">4-1-2-1-2</option>
                    <option value="4-2-2-2">4-2-2-2</option>
                    <option value="3-5-2">3-5-2</option>
                    <option value="3-4-3">3-4-3</option>
                    <option value="3-4-2-1">3-4-2-1</option>
                    <option value="3-4-1-2">3-4-1-2</option>
                    <option value="5-3-2">5-3-2</option>
                    <option value="5-4-1">5-4-1</option>
                  </select>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] p-2 rounded-xl flex items-center justify-between gap-1">
                      <label className="text-slate-500 text-[10px] font-medium">Echipă</label>
                      <input type="color" value={teamColor} onChange={e => setTeamColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
                    </div>
                    <div className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] p-2 rounded-xl flex items-center justify-between gap-1">
                      <label className="text-slate-500 text-[10px] font-medium">Adversar</label>
                      <input type="color" value={opponentColor} onChange={e => setOpponentColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-none" />
                    </div>
                    <div className="bg-white dark:bg-[#101726] border border-slate-200 dark:border-white/[0.08] p-2 rounded-xl flex items-center justify-between gap-1">
                      <label className="text-slate-500 text-[10px] font-medium">Acasă?</label>
                      <input type="checkbox" checked={isHome} onChange={e => setIsHome(e.target.checked)} className="w-4 h-4 accent-emerald-500 cursor-pointer" />
                    </div>
                  </div>

                  {/* Preview culori */}
                  <div className="flex gap-2 justify-center py-1">
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-semibold border border-black/10"
                      style={{
                        backgroundColor: isHome ? teamColor : opponentColor,
                        color: getContrastTextColor(isHome ? teamColor : opponentColor)
                      }}
                    >
                      {(isHome ? teamName : opponent) || "Gazdă"}
                    </span>
                    <span
                      className="px-3 py-1 rounded-lg text-xs font-semibold border border-black/10"
                      style={{
                        backgroundColor: isHome ? opponentColor : teamColor,
                        color: getContrastTextColor(isHome ? opponentColor : teamColor)
                      }}
                    >
                      {(isHome ? opponent : teamName) || "Oaspete"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-500 text-xs font-medium block">Cei 11 titulari</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 11 }).map((_, idx) => {
                        const player = slotPlayers[idx];
                        return (
                          <input
                            key={idx}
                            type="text"
                            placeholder={getSlotLabel(idx, formation)}
                            value={player ? player.name : ''}
                            onChange={(e) => {
                              const newSlots = [...slotPlayers];
                              newSlots[idx] = { name: e.target.value, gridRow: getGridRowForSlot(idx, formation) };
                              setSlotPlayers(newSlots);
                            }}
                            className={`px-2.5 py-2 rounded-xl border text-xs transition-colors outline-none ${
                              player?.name.trim()
                                ? 'bg-emerald-500/10 border-emerald-500/35 text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-[#101726] border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveXI}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> {editingXiId ? 'Actualizează meciul' : 'Salvează meciul'}
                  </button>
                </div>

                {/* Lista Meciuri DB */}
                <div className="bg-slate-50 dark:bg-[#090D16] p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/[0.07] flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 pb-3 border-b border-slate-200 dark:border-white/[0.07]">
                    Istoric meciuri ({xis.length})
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[520px] pr-1">
                    {xis.length === 0 ? (
                      <p className="text-slate-500 text-center text-xs py-10">Nu există meciuri salvate.</p>
                    ) : (
                      xis.map(x => {
                        const hColor = x.isHome !== false ? (x.teamColor || '#334155') : (x.opponentColor || '#334155');
                        const aColor = x.isHome !== false ? (x.opponentColor || '#334155') : (x.teamColor || '#334155');
                        const hName = x.isHome !== false ? x.teamName : x.opponent;
                        const aName = x.isHome !== false ? x.opponent : x.teamName;

                        return (
                          <div
                            key={x._id || x.id}
                            className={`bg-white dark:bg-[#101726] border rounded-xl p-3 flex justify-between items-center gap-2 transition-colors ${
                              editingXiId === (x._id || x.id)
                                ? 'border-emerald-500'
                                : 'border-slate-200 dark:border-white/[0.07]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span
                                  className="font-semibold text-[11px] px-2 py-0.5 rounded-md truncate max-w-[110px]"
                                  style={{ backgroundColor: hColor, color: getContrastTextColor(hColor) }}
                                >
                                  {hName}
                                </span>
                                <span className="text-slate-400 text-[10px]">vs</span>
                                <span
                                  className="font-semibold text-[11px] px-2 py-0.5 rounded-md truncate max-w-[110px]"
                                  style={{ backgroundColor: aColor, color: getContrastTextColor(aColor) }}
                                >
                                  {aName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono-stats">
                                {x.date} • {x.formation} • {x.score}
                              </div>
                            </div>

                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEditXI(x)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#090D16] text-slate-500 hover:text-emerald-500 transition-colors cursor-pointer"
                                title="Editează"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteXI(x._id || x.id || '')}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#090D16] text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                                title="Șterge"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL ARTICOL (TANSTACK FORM) */}
      {showStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4" onClick={() => setShowStoryModal(false)}>
          <div className="bg-white dark:bg-[#101726] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-white/[0.08] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Editează articol' : 'Adaugă articol nou'}
              </h3>
              <button
                onClick={() => setShowStoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                storyForm.handleSubmit();
              }}
            >
              <div className="p-4 sm:p-5 overflow-y-auto space-y-3 max-h-[65vh]">
                <storyForm.Field name="title">
                  {(field) => (
                    <input
                      className="w-full bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      placeholder="Titlu / Nume erou"
                    />
                  )}
                </storyForm.Field>
                <div className="grid grid-cols-2 gap-3">
                  <storyForm.Field name="date">
                    {(field) => (
                      <input
                        className="w-full bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 font-mono-stats"
                        value={field.state.value}
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="An / Perioadă"
                      />
                    )}
                  </storyForm.Field>
                  <storyForm.Field name="role">
                    {(field) => (
                      <input
                        className="w-full bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        value={field.state.value}
                        onChange={e => field.handleChange(e.target.value)}
                        placeholder="Rol (ex: Maseur)"
                      />
                    )}
                  </storyForm.Field>
                </div>
                <storyForm.Field name="organization">
                  {(field) => (
                    <input
                      className="w-full bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      placeholder="Club / Organizație"
                    />
                  )}
                </storyForm.Field>
                <storyForm.Field name="excerpt">
                  {(field) => (
                    <input
                      className="w-full bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      placeholder="Prezentare scurtă..."
                    />
                  )}
                </storyForm.Field>
                <storyForm.Field name="content">
                  {(field) => (
                    <textarea
                      className="w-full bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/[0.08] px-3 py-2.5 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 min-h-[120px] resize-y"
                      value={field.state.value}
                      onChange={e => field.handleChange(e.target.value)}
                      placeholder="Povestea completă..."
                    />
                  )}
                </storyForm.Field>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-white/[0.07]">
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}