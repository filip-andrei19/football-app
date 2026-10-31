import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Tag, Trash2, User, X, Upload, ChevronLeft, ChevronRight, Phone, Maximize2, AlertTriangle, Loader2, MessageCircle, Share2, Copy, Send, Heart, Flag, Shield, FileText } from 'lucide-react';import toast from 'react-hot-toast'; 
import { SkeletonCard } from './SkeletonCard'; 

// --- INTERFEȚE ---
interface Product {
  _id: string; 
  title: string; 
  price: string; 
  category: string; 
  images: string[]; 
  description: string; 
  seller: string; 
  sellerEmail: string; 
  sellerPhone: string; 
  sellerAvatar?: string; 
  posted: string; 
}

interface Conversation {
    roomId: string;
    title: string;
    image: string;
    lastMessage: string;
    timestamp: string;
}

interface CollectorsHubProps { 
    user: { 
        name: string; 
        email: string; 
        role?: string;
        avatar?: string;
        favorites?: string[]; 
    }; 
    onOpenChat: (roomId: string, partner: { name: string, avatar?: string }) => void;
    initialPostId?: string | null;
}

const CATEGORIES = ["Toate", "Tricouri", "Fulare", "Bilete & Programe", "Suveniruri", "Echipament"];
const API_URL = (import.meta as any).env.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api/listings` : 'https://football-backend-m2a4.onrender.com/api/listings'; 

// --- MODAL PARTAJARE (STILIZAT SPORTIV) ---
const ShareModal = ({ product, user, onClose }: { product: Product, user: any, onClose: () => void }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchConversations(); }, []);

    const fetchConversations = async () => {
        try {
            const res = await fetch('https://football-backend-m2a4.onrender.com/api/messages/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, name: user.name })
            });
            if (res.ok) setConversations(await res.json());
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleExternalShare = async () => {
        const link = `${window.location.origin}/?postId=${product._id}`;
        const shareData = {
            title: `Romania Scout: ${product.title}`,
            text: `Salut! Uite ce am găsit pe piața de transferuri: ${product.title} - ${product.price}`,
            url: link
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${shareData.text}\n${link}`);
                toast.success("Link copiat spre vestiar!");
            }
        } catch (e) {}
    };

    const handleSendToChat = async (roomId: string, chatTitle: string) => {
        const siteLink = `${window.location.origin}/?postId=${product._id}`;
        const messageText = `👀 Propunere de transfer:\n**${product.title}**\nCotă: ${product.price}\nVezi detalii aici: ${siteLink}`;
        const time = new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes();

        try {
            const res = await fetch('https://football-backend-m2a4.onrender.com/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: roomId,
                    author: user.name,
                    authorRole: user.role === 'admin' ? 'admin' : 'user',
                    message: messageText,
                    time: time
                })
            });

            if (res.ok) {
                toast.success(`Trimis către ${chatTitle}!`);
                onClose();
            }
        } catch (e) { toast.error("Eroare la pasă."); }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] border-4 border-blue-600/30 animate-in zoom-in-95">
                <div className="bg-slate-900 p-4 border-b-2 border-blue-600 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_12px)]"></div>
                    <h3 className="font-black text-lg text-white uppercase tracking-widest relative z-10 flex items-center gap-2"><Share2 className="w-5 h-5 text-blue-400"/> Trimite mai departe</h3>
                    <button onClick={onClose} className="relative z-10 bg-slate-800 hover:bg-rose-500 rounded-full p-1.5 transition-colors border border-slate-700 text-white"><X className="w-4 h-4 font-bold"/></button>
                </div>
                <div className="p-5 space-y-4 bg-slate-50 dark:bg-slate-950">
                    <div className="flex gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                        {product.images[0] ? <img src={product.images[0]} className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"/> : <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-slate-400"/></div>}
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                            <div className="font-black text-sm text-slate-900 dark:text-white truncate uppercase tracking-tight">{product.title}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">{product.price}</div>
                        </div>
                    </div>
                    <button onClick={handleExternalShare} className="w-full flex items-center justify-center gap-3 p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all border-b-4 border-blue-800 hover:translate-y-[2px] hover:border-b-2 font-black uppercase tracking-widest text-xs">
                        <Copy className="w-4 h-4"/> Copiază Link / Alte Aplicații
                    </button>
                    <div className="border-t-2 border-slate-200 dark:border-slate-800 my-4"></div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Send className="w-3.5 h-3.5"/> Trimite unui coechipier (Chat)</div>
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {loading ? <div className="text-center text-xs text-blue-500 py-4 font-bold uppercase"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2"/> Preluare Contacte...</div> :
                         conversations.length === 0 ? <div className="text-center text-xs text-slate-500 py-4 font-bold uppercase border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">Nu ai conversații active pe teren.</div> :
                         conversations.map(conv => (
                             <button key={conv.roomId} onClick={() => handleSendToChat(conv.roomId, conv.title)} className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-900 hover:border-blue-500 border-2 border-slate-200 dark:border-slate-800 rounded-2xl transition-colors text-left group">
                                 {conv.image ? <img src={conv.image} className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"/> : <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-black uppercase">CH</div>}
                                 <div className="flex-1 truncate">
                                     <div className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{conv.title}</div>
                                 </div>
                                 <Send className="w-4 h-4 text-slate-400 group-hover:text-blue-500 shrink-0"/>
                             </button>
                         ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CARD PRODUS (COMPLET - STIL MATCHDAY) ---
const ProductCard = ({ product, user, onDelete, onClick, onStartChat, onShare, onToggleFavorite, isFavorite }: { product: Product, user: any, onDelete: (id: string) => void, onClick: (p: Product) => void, onStartChat: (p: Product) => void, onShare: (p: Product) => void, onToggleFavorite: (id: string) => void, isFavorite: boolean }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = product.images || [];
  const sellerName = product.seller || "Necunoscut";
  const [avatarError, setAvatarError] = useState(false);
  const isOwner = product.sellerEmail === user.email;

  return (
    <div onClick={() => onClick(product)} className="group bg-white dark:bg-slate-900 rounded-3xl border-4 border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-[0_15px_30px_rgba(37,99,235,0.15)] hover:border-blue-500 transition-all duration-300 flex flex-col h-full cursor-pointer relative hover:-translate-y-1">
      
      <div className="absolute top-3 left-3 z-20 bg-slate-900/80 backdrop-blur-md text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700"><Maximize2 className="w-4 h-4" /></div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(product._id); }} 
        className={`absolute top-3 right-3 z-20 p-2.5 rounded-xl shadow-md transition-all border-2 ${isFavorite ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-900/30 dark:border-rose-800' : 'bg-white/90 backdrop-blur border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:bg-slate-900/80 dark:border-slate-700'}`}
        title="Adaugă în Lista de Scout"
      >
        <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* Zona Imagine */}
      <div className="relative h-60 bg-slate-100 dark:bg-slate-800 border-b-4 border-slate-200 dark:border-slate-800 overflow-hidden shrink-0">
        {images.length > 0 ? (
          <img src={images[currentImgIndex]} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Eroare+Imagine' }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-200 dark:bg-slate-800 p-4 text-center"><AlertTriangle className="w-8 h-8 mb-2 opacity-50" /><span className="text-xs font-bold uppercase tracking-widest">Fără imagine</span></div>
        )}
        
        {/* Categorie */}
        <div className="absolute bottom-3 right-3 bg-slate-900 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md z-10 border border-slate-700 flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> {product.category || "General"}
        </div>

        {/* Butoane Navigare Imagini */}
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); if(images.length>0) setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-slate-700"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={(e) => { e.stopPropagation(); if(images.length>0) setCurrentImgIndex((prev) => (prev + 1) % images.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-slate-700"><ChevronRight className="w-5 h-5" /></button>
            
            {/* Indicatori poze */}
            <div className="absolute bottom-3 left-3 flex gap-1 z-10 bg-slate-900/50 backdrop-blur px-2 py-1 rounded-full">
                {images.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImgIndex ? 'bg-white' : 'bg-white/40'}`}></div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Detalii */}
      <div className="p-5 flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
        <div className="flex justify-between items-start mb-2 gap-3">
            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1" title={product.title}>{product.title || "Fără Titlu"}</h3>
        </div>
        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mb-3">{product.price || "N/A"}</div>
        
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-4 line-clamp-2 flex-1">{product.description || "Fără descriere."}</p>
        
        {/* Footer Card */}
        <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 mt-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {product.sellerAvatar && !avatarError ? (
                  <img src={product.sellerAvatar} alt={sellerName} className="w-10 h-10 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-white" onError={() => setAvatarError(true)} />
              ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm uppercase shadow-sm border-2 border-blue-200 dark:border-blue-800">{sellerName.charAt(0)}</div>
              )}
              <div className="flex flex-col leading-none">
                 <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Shield className="w-3 h-3"/> Impresar</span>
                 <span className="font-bold text-xs uppercase tracking-wider truncate max-w-[100px] text-slate-800 dark:text-slate-200">{sellerName}</span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onShare(product); }} className="text-slate-400 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:text-blue-600 hover:border-blue-500 p-2 rounded-xl transition-colors z-20" title="Dă mai departe">
                    <Share2 className="w-4 h-4" />
                </button>

                {!isOwner && (
                    <button onClick={(e) => { e.stopPropagation(); onStartChat(product); }} className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800/50 hover:bg-blue-600 hover:text-white p-2 rounded-xl transition-colors z-20" title="Negociază">
                        <MessageCircle className="w-4 h-4" />
                    </button>
                )}
                
                {isOwner && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(product._id); }} className="text-rose-500 bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-200 dark:border-rose-800/50 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition-colors z-20" title="Retrage Anunț">
                      <Trash2 className="w-4 h-4" />
                  </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MODAL VIZUALIZARE PRODUS (STILIZAT CA UN PANOU DE PREZENTARE) ---
const ProductViewModal = ({ product, user, onClose, onShare, onToggleFavorite, isFavorite }: { product: Product, user: any, onClose: () => void, onShare: (p: Product) => void, onToggleFavorite: (id: string) => void, isFavorite: boolean }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const images = product.images || [];
    const [avatarError, setAvatarError] = useState(false); 

    const isAdmin = user?.role === 'admin' || user?.email === 'admin.nou@scout.ro';
    const isOwner = product.sellerEmail === user.email;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
    };

    const handleReportListing = async () => {
        if (!window.confirm("Apeși butonul de VAR? Ești sigur că acest anunț încalcă regulamentul?")) return;
        try {
            const res = await fetch(`https://football-backend-m2a4.onrender.com/api/listings/${product._id}/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: user.name })
            });
            if (res.ok) {
                toast.success("Incidentul a fost raportat la Comisie (VAR).");
            }
        } catch (err) {
            toast.error("Eroare la raportare.");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[95vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 border-4 border-slate-700 relative">
                
                {/* Header Butoane Modal - Acțiuni rapide suprapuse */}
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <button onClick={() => onToggleFavorite(product._id)} className="bg-slate-900/80 backdrop-blur hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-700 transition">
                        <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                    <button onClick={() => onShare(product)} className="bg-slate-900/80 backdrop-blur hover:bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-700 transition"><Share2 className="w-5 h-5" /></button>
                    <button onClick={onClose} className="bg-slate-900/80 backdrop-blur hover:bg-rose-500 text-white p-2.5 rounded-xl shadow-lg border border-slate-700 hover:border-rose-500 transition"><X className="w-5 h-5 font-bold" /></button>
                </div>

                {/* Zona Imagini (Partea stângă pe desktop) */}
                <div className="w-full md:w-3/5 bg-slate-100 dark:bg-slate-950 flex flex-col relative h-[40vh] md:h-auto border-b-4 md:border-b-0 md:border-r-4 border-slate-200 dark:border-slate-800">
                    <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onMouseMove={handleMouseMove} onClick={() => setIsZoomed(!isZoomed)} onMouseLeave={() => setIsZoomed(false)}>
                        {/* Teren Fotbal fundal pentru imagini */}
                        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_20px,#000_20px,#000_22px)] pointer-events-none"></div>
                        
                        {images.length > 0 ? (
                            <img src={images[activeIdx]} className="max-w-full max-h-full object-contain relative z-10 transition-transform duration-200 drop-shadow-xl p-4" style={{ transformOrigin: `${mousePos.x}% ${mousePos.y}%`, transform: isZoomed ? 'scale(2.5)' : 'scale(1)' }} />
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center font-black uppercase tracking-widest"><AlertTriangle className="mb-2 w-10 h-10"/> Fără fotografie</div>
                        )}
                    </div>
                    {images.length > 1 && (
                        <div className="p-4 bg-slate-200 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-800 flex gap-3 overflow-x-auto justify-center z-40 relative">
                            {images.map((img, idx) => (
                                <button key={idx} onClick={() => { setActiveIdx(idx); setIsZoomed(false); }} className={`relative w-16 h-16 rounded-xl overflow-hidden border-4 shrink-0 transition-all ${activeIdx === idx ? 'border-blue-600 scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                                    <img src={img} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Zona Detalii (Partea dreaptă pe desktop) */}
                <div className="w-full md:w-2/5 p-6 sm:p-8 flex flex-col overflow-y-auto bg-slate-50 dark:bg-slate-900">
                    <div className="mb-6">
                        <span className="inline-flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-black px-3 py-1.5 rounded-lg mb-3 uppercase tracking-widest border border-blue-200 dark:border-blue-800">
                            <Tag className="w-3 h-3"/> {product.category || "General"}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-3">{product.title}</h2>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 inline-block px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50">{product.price}</div>
                    </div>
                    
                    <div className="mb-8 border-t-2 border-b-2 border-slate-200 dark:border-slate-800 py-6">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3 flex items-center gap-2"><FileText className="w-4 h-4"/> Fișa Produsului</h4>
                        <p className="whitespace-pre-wrap text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{product.description}</p>
                    </div>
                    
                    {/* ZONA CONTACT VÂNZĂTOR (Stil Legitimație Impresar) */}
                    <div className="mt-auto bg-white dark:bg-slate-950 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-800 relative shadow-sm">
                        {/* BUTON VAR (Raport) */}
                        {!isOwner && !isAdmin && (
                            <button 
                                onClick={handleReportListing}
                                className="absolute top-4 right-4 flex items-center gap-1 text-[9px] uppercase font-black tracking-widest text-slate-400 hover:text-amber-500 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                                title="Cheamă VAR-ul dacă anunțul e fals"
                            >
                                <Flag className="w-3 h-3"/> VAR
                            </button>
                        )}

                        <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><User className="w-4 h-4 text-blue-500" /> Contact Impresar</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                {product.sellerAvatar && !avatarError ? (
                                    <img src={product.sellerAvatar} className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm" onError={() => setAvatarError(true)} />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xl uppercase border-2 border-blue-200 dark:border-blue-800 shadow-sm">{product.seller.charAt(0)}</div>
                                )}
                                <div>
                                    <div className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{product.seller}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Membru Market</div>
                                </div>
                            </div>
                            
                            {/* Numărul de telefon vizibil ca un buton */}
                            {product.sellerPhone && (
                                <a href={`tel:${product.sellerPhone}`} className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl border-b-4 border-slate-950 hover:translate-y-[2px] hover:border-b-2 transition-all w-full">
                                    <Phone className="w-5 h-5 text-emerald-400" />
                                    <span className="font-black uppercase tracking-widest">{product.sellerPhone}</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- LOGICA PRINCIPALĂ (COLLECTORS HUB) ---
export function CollectorsHubSection({ user, onOpenChat, initialPostId }: CollectorsHubProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items' | 'favorites'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  const [newProduct, setNewProduct] = useState({ title: '', price: '', category: 'Tricouri', images: [] as string[], description: '', phone: '' });
  
  const [productToShare, setProductToShare] = useState<Product | null>(null);
  const [userFavorites, setUserFavorites] = useState<string[]>(user?.favorites || []);

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
      if (initialPostId && products.length > 0) {
          const foundProduct = products.find(p => p._id === initialPostId);
          if (foundProduct) {
              setSelectedProduct(foundProduct);
              toast.success("Am găsit produsul căutat!");
          }
      }
  }, [products, initialPostId]);

  const fetchProducts = async () => {
      try {
          const res = await fetch(API_URL);
          if (!res.ok) throw new Error("Eroare server");
          const data = await res.json();
          if (Array.isArray(data)) setProducts(data);
      } catch (err) { toast.error("Gazon impracticabil. Nu s-au încărcat produsele."); } finally { setLoading(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) { Array.from(files).forEach(file => { const reader = new FileReader(); reader.onloadend = () => setNewProduct(p => ({ ...p, images: [...p.images, reader.result as string] })); reader.readAsDataURL(file); }); }
  };
  const removeImage = (i: number) => setNewProduct(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}));

  const handleAddProduct = async () => {
    if (!newProduct.title) return toast.error("Trebuie să pui un titlu!");
    if (!newProduct.price) return toast.error("Setează o cotă de transfer (Preț)!");
    if (!newProduct.phone) return toast.error("Lasă un telefon pentru oferte!");
    if (newProduct.images.length === 0) return toast.error("Adaugă cel puțin o poză pentru vizita medicală!");

    setIsSubmitting(true);
    try {
        const { phone, ...dataToSend } = newProduct;

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...dataToSend, 
                seller: user.name, 
                sellerEmail: user.email, 
                sellerPhone: phone, 
                sellerAvatar: user.avatar 
            })
        });
        if (res.ok) {
            setProducts([await res.json(), ...products]);
            setShowAddModal(false);
            setNewProduct({ title: '', price: '', category: 'Tricouri', images: [], description: '', phone: '' });
            toast.success("Transfer înregistrat oficial!");
        } else {
            const data = await res.json();
            toast.error(data.error || "Eroare la transfer");
        }
    } catch (e) { toast.error("Eroare conexiune"); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
      if(!window.confirm("Retragi acest articol de pe piață?")) return;
      await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
      setProducts(products.filter(p => p._id !== id));
      toast.success("Articol retras.");
  };

  const handleStartChat = (product: Product) => {
      const roomId = `listing_${product._id}`;
      const partner = { name: product.seller, avatar: product.sellerAvatar };
      onOpenChat(roomId, partner);
      toast.success(`Sala de negocieri deschisă cu ${product.seller}`);
  };

  const handleToggleFavorite = async (listingId: string) => {
      try {
          const res = await fetch('https://football-backend-m2a4.onrender.com/api/users/favorites/toggle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email, listingId })
          });
          if (res.ok) {
              const data = await res.json();
              setUserFavorites(data.favorites);
              if (data.favorites.includes(listingId)) {
                  toast.success("Adăugat în Lista de Scout! 📝");
              } else {
                  toast("Tăiat de pe listă.");
              }
          }
      } catch (e) {
          toast.error("Eroare la procesare.");
      }
  };

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const titleMatch = (p.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'my_items') matchesTab = p.sellerEmail === user.email;
    if (activeTab === 'favorites') matchesTab = userFavorites.includes(p._id);

    const matchesCategory = selectedCategory === "Toate" ? true : p.category === selectedCategory;
    return titleMatch && matchesTab && matchesCategory;
  });

  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-transparent z-0 animate-in fade-in duration-500 pb-20">
      
      {/* FUNDAL SPORTIV (Piața de transferuri) */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
          <div className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 w-[50vw] h-[50vw] rounded-full bg-blue-600/5 dark:bg-blue-600/10 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -translate-x-1/4 translate-y-1/4 w-[40vw] h-[40vw] rounded-full bg-emerald-500/5 dark:bg-emerald-600/10 blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border-b-4 border-blue-600 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden mb-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,transparent_0,transparent_100px,#fff_101px,#fff_103px,transparent_104px)]"></div>
        
        <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3 drop-shadow-md">
                <ShoppingBag className="w-8 h-8 text-blue-500" /> Fanshop <span className="text-blue-500">Market</span>
            </h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Piața oficială de transferuri pentru colecționari.</p>
        </div>
        
        <div className="flex bg-slate-950 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto border-2 border-slate-800 relative z-10 scrollbar-hide">
          <button onClick={() => setActiveTab('market')} className={`px-5 py-2.5 whitespace-nowrap rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'market' ? 'bg-blue-600 border-blue-800 text-white' : 'border-transparent text-slate-500 hover:text-white hover:bg-slate-800'}`}>Toate</button>
          <button onClick={() => setActiveTab('favorites')} className={`px-5 py-2.5 whitespace-nowrap rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 border-b-2 ${activeTab === 'favorites' ? 'bg-rose-600 border-rose-800 text-white' : 'border-transparent text-slate-500 hover:text-white hover:bg-slate-800'}`}><Heart className={`w-4 h-4 ${activeTab==='favorites'?'fill-white':'text-rose-500'}`} /> Listă Scout</button>
          <button onClick={() => setActiveTab('my_items')} className={`px-5 py-2.5 whitespace-nowrap rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 border-b-2 ${activeTab === 'my_items' ? 'bg-emerald-600 border-emerald-800 text-white' : 'border-transparent text-slate-500 hover:text-white hover:bg-slate-800'}`}><User className="w-4 h-4" /> Taraba Mea</button>
        </div>
        
        <button onClick={() => setShowAddModal(true)} className="relative z-10 w-full md:w-auto bg-blue-600 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 border-b-4 border-blue-800 hover:bg-blue-500 hover:border-b-2 hover:translate-y-[2px] transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Plus className="w-5 h-5 font-bold" /> Pune pe Tarabă
        </button>
      </div>

      <div className="space-y-5 mb-8">
        <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
                type="text" 
                placeholder="CAUTĂ ÎN MAGAZIN (EX: TRICOU HAGI)..." 
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-blue-500 dark:focus:border-blue-500 outline-none font-black uppercase tracking-widest text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors shadow-sm" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
        </div>
        <div className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
                <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)} 
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap border-2 transition-all ${
                        selectedCategory === cat 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-900 dark:hover:border-slate-500'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
      </div>

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 max-w-2xl mx-auto">
            {activeTab === 'favorites' ? (
                <>
                    <Heart className="w-16 h-16 text-rose-300 dark:text-rose-900/50 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">Lista de Scout e goală.</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-wide text-xs">Apasă pe inima de pe carduri pentru a salva aici.</p>
                </>
            ) : (
                <>
                    <Tag className="w-16 h-16 text-blue-300 dark:text-blue-900/50 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">Magazia e goală.</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-wide text-xs">Niciun produs nu corespunde căutării tale.</p>
                </>
            )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-in slide-in-from-bottom-8 duration-700">
            {filteredProducts.map((product) => (
                <ProductCard 
                    key={product._id} 
                    product={product} 
                    user={user} 
                    onDelete={handleDelete} 
                    onClick={setSelectedProduct} 
                    onStartChat={handleStartChat} 
                    onShare={(p) => setProductToShare(p)} 
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={userFavorites.includes(product._id)}
                />
            ))}
        </div>
      )}

      {selectedProduct && 
        <ProductViewModal 
            product={selectedProduct} 
            user={user}
            onClose={() => setSelectedProduct(null)} 
            onShare={(p) => setProductToShare(p)} 
            onToggleFavorite={handleToggleFavorite}
            isFavorite={userFavorites.includes(selectedProduct._id)}
        />
      }

      {productToShare && <ShareModal product={productToShare} user={user} onClose={() => setProductToShare(null)} />}

      {/* MODAL ADĂUGARE PRODUS (STILIZAT OFICIAL) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[92vh] border-4 border-blue-600/30 overflow-hidden">
            <div className="p-5 sm:p-6 border-b-4 border-blue-600 flex justify-between items-center shrink-0 bg-slate-900 text-white relative">
                <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_12px)]"></div>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest flex items-center gap-2 relative z-10"><ShoppingBag className="w-5 h-5 text-blue-400"/> Formular Transfer</h3>
                <button onClick={() => setShowAddModal(false)} className="relative z-10 bg-slate-800 hover:bg-rose-500 p-2 rounded-full border border-slate-700 transition-colors"><X className="w-5 h-5 font-bold" /></button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1.5">Articol <span className="text-rose-500">*</span></label>
                  <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors font-bold uppercase tracking-tight text-sm text-slate-900 dark:text-white" placeholder="EX: TRICOU HAGI 1994" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-1.5">Cotă (Preț) <span className="text-rose-500">*</span></label>
                      <input type="text" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-emerald-500 transition-colors font-bold uppercase tracking-tight text-sm text-slate-900 dark:text-white" placeholder="EX: 500 RON" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1.5">Telefon <span className="text-rose-500">*</span></label>
                      <input type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors font-bold uppercase tracking-tight text-sm text-slate-900 dark:text-white" placeholder="07XX..." value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                  </div>
              </div>
              
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1.5">Tip Echipament</label>
                  <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors font-bold uppercase tracking-tight text-sm text-slate-900 dark:text-white cursor-pointer" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                      {CATEGORIES.filter(c => c !== "Toate").map(cat => (<option key={cat}>{cat}</option>))}
                  </select>
              </div>
              
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800">
                <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-2">Imagini (Vizita Medicală) <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                   {newProduct.images.map((img, idx) => (
                       <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-500">
                           <img src={img} className="w-full h-full object-cover" />
                           <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg hover:bg-rose-600"><X className="w-3 h-3 font-bold" /></button>
                       </div>
                   ))}
                   {newProduct.images.length < 5 && (
                       <label className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-colors text-slate-400">
                           <Upload className="w-6 h-6 mb-1" />
                           <span className="text-[9px] font-black uppercase tracking-widest">Incarcă</span>
                           <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                       </label>
                   )}
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-800 flex-1">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1.5">Fișa Produsului <span className="text-rose-500">*</span></label>
                  <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl h-28 outline-none focus:border-blue-500 transition-colors font-medium text-sm text-slate-900 dark:text-white resize-y" placeholder="Stare, defecte, istoric..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
              </div>
              
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700">
                  {user.avatar ? <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm"/> : <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm uppercase border-2 border-blue-200">{user.name.charAt(0)}</div>}
                  <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Semnatar (Impresar)</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.name}</span>
                  </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button type="button" onClick={handleAddProduct} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm py-4 rounded-2xl transition-all border-b-4 border-blue-800 hover:border-b-2 hover:translate-y-[2px] flex justify-center items-center gap-3">
                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5"/> : 'Publică Oficial'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}