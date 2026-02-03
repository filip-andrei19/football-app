import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Tag, Trash2, User, X, Upload, ChevronLeft, ChevronRight, Phone, Maximize2, ZoomIn, AlertTriangle, Loader2, MessageCircle, Share2, Copy, Send } from 'lucide-react';
import toast from 'react-hot-toast'; 
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
        avatar?: string; 
    }; 
    onOpenChat: (roomId: string, partner: { name: string, avatar?: string }) => void;
    initialPostId?: string | null;
}

const CATEGORIES = ["Toate", "Tricouri", "Fulare", "Bilete & Programe", "Suveniruri", "Echipament"];
const API_URL = 'https://football-backend-m2a4.onrender.com/api/listings'; 

// --- MODAL PARTAJARE ---
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
            text: `Salut! Uite ce am găsit: ${product.title} - ${product.price}`,
            url: link
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${shareData.text}\n${link}`);
                toast.success("Link copiat!");
            }
        } catch (e) {}
    };

    const handleSendToChat = async (roomId: string, chatTitle: string) => {
        const siteLink = `${window.location.origin}/?postId=${product._id}`;
        const messageText = `👀 Uite ce am găsit:\n**${product.title}**\nPreț: ${product.price}\nVezi anunțul aici: ${siteLink}`;
        const time = new Date().getHours() + ":" + (new Date().getMinutes() < 10 ? '0' : '') + new Date().getMinutes();

        try {
            const res = await fetch('https://football-backend-m2a4.onrender.com/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    room: roomId,
                    author: user.name,
                    message: messageText,
                    time: time
                })
            });

            if (res.ok) {
                toast.success(`Trimis către ${chatTitle}!`);
                onClose();
            }
        } catch (e) { toast.error("Eroare la trimitere."); }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Partajează</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex gap-3 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
                        {product.images[0] && <img src={product.images[0]} className="w-12 h-12 rounded-lg object-cover"/>}
                        <div>
                            <div className="font-bold text-sm dark:text-white line-clamp-1">{product.title}</div>
                            <div className="text-xs text-green-600 font-bold">{product.price}</div>
                        </div>
                    </div>
                    <button onClick={handleExternalShare} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-gray-100 dark:border-slate-700">
                        <div className="bg-blue-100 text-blue-600 p-2 rounded-full"><Copy className="w-4 h-4"/></div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Copiază Link / Alte Aplicații</span>
                    </button>
                    <div className="border-t border-gray-100 dark:border-slate-800 my-2"></div>
                    <div className="text-xs font-bold text-gray-400 uppercase">Trimite în Chat-urile tale</div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {loading ? <div className="text-center text-xs text-gray-400 py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto"/></div> :
                         conversations.length === 0 ? <div className="text-center text-xs text-gray-400 py-4">Nu ai conversații active.</div> :
                         conversations.map(conv => (
                             <button key={conv.roomId} onClick={() => handleSendToChat(conv.roomId, conv.title)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left">
                                 {conv.image ? <img src={conv.image} className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">IMG</div>}
                                 <div className="flex-1 truncate">
                                     <div className="text-sm font-bold text-gray-800 dark:text-white truncate">{conv.title}</div>
                                 </div>
                                 <Send className="w-4 h-4 text-gray-400"/>
                             </button>
                         ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- CARD PRODUS (COMPLET) ---
const ProductCard = ({ product, user, onDelete, onClick, onStartChat, onShare }: { product: Product, user: any, onDelete: (id: string) => void, onClick: (p: Product) => void, onStartChat: (p: Product) => void, onShare: (p: Product) => void }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = product.images || [];
  const sellerName = product.seller || "Necunoscut";
  const [avatarError, setAvatarError] = useState(false);

  return (
    <div onClick={() => onClick(product)} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer relative">
      <div className="absolute top-3 left-3 z-20 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><Maximize2 className="w-4 h-4" /></div>
      <div className="relative h-64 bg-gray-100">
        {images.length > 0 ? (
          <img src={images[currentImgIndex]} alt={product.title} className="w-full h-full object-cover transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Eroare+Imagine' }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-200 p-4 text-center"><AlertTriangle className="w-8 h-8 mb-2 opacity-50" /><span className="text-xs">Fără imagine</span></div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-800 shadow-sm z-10">{product.category || "General"}</div>
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); if(images.length>0) setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={(e) => { e.stopPropagation(); if(images.length>0) setCurrentImgIndex((prev) => (prev + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"><ChevronRight className="w-5 h-5" /></button>
          </>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{product.title || "Fără Titlu"}</h3><span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap">{product.price || "N/A"}</span></div>
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{product.description || "Fără descriere."}</p>
        
        {/* FOOTER CU AVATAR, NUME ȘI BUTOANE */}
        <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {product.sellerAvatar && !avatarError ? (
                  <img src={product.sellerAvatar} alt={sellerName} className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-sm" onError={() => setAvatarError(true)} />
              ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase shadow-sm border border-white">{sellerName.charAt(0)}</div>
              )}
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Vânzător</span>
                 <span className="font-medium truncate max-w-[100px] text-gray-900">{sellerName}</span>
              </div>
            </div>

            <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); onShare(product); }} className="text-gray-500 hover:bg-gray-100 p-2 rounded-lg transition-colors z-20 relative" title="Partajează">
                    <Share2 className="w-5 h-5" />
                </button>

                {product.sellerEmail !== user.email && (
                    <button onClick={(e) => { e.stopPropagation(); onStartChat(product); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors z-20 relative" title="Trimite Mesaj">
                        <MessageCircle className="w-5 h-5" />
                    </button>
                )}
                
                {(product.sellerEmail === user.email || !product.sellerEmail) && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(product._id); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors z-20 relative"><Trash2 className="w-4 h-4" /></button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MODAL VIZUALIZARE (CU DETALII CONTACT REPUSE) ---
const ProductViewModal = ({ product, onClose, onShare }: { product: Product, onClose: () => void, onShare: (p: Product) => void }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const images = product.images || [];
    const [avatarError, setAvatarError] = useState(false); 

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 relative">
                
                {/* Header Butoane Modal */}
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <button onClick={() => onShare(product)} className="bg-white/80 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg"><Share2 className="w-6 h-6" /></button>
                    <button onClick={onClose} className="bg-white/80 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg"><X className="w-6 h-6" /></button>
                </div>

                {/* Zona Imagini */}
                <div className="w-full md:w-3/5 bg-gray-100 flex flex-col relative h-[50vh] md:h-auto border-r border-gray-100">
                    <div className={`flex-1 relative overflow-hidden flex items-center justify-center bg-white ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onMouseMove={handleMouseMove} onClick={() => setIsZoomed(!isZoomed)} onMouseLeave={() => setIsZoomed(false)}>
                        {images.length > 0 ? (<img src={images[activeIdx]} className="max-w-full max-h-full object-contain transition-transform duration-200" style={{ transformOrigin: `${mousePos.x}% ${mousePos.y}%`, transform: isZoomed ? 'scale(2.5)' : 'scale(1)' }} />) : (<div className="text-gray-400 flex flex-col items-center"><AlertTriangle className="mb-2"/> Fără imagine</div>)}
                    </div>
                    {images.length > 1 && (<div className="p-4 bg-white border-t border-gray-100 flex gap-3 overflow-x-auto justify-center z-40 relative">{images.map((img, idx) => (<button key={idx} onClick={() => { setActiveIdx(idx); setIsZoomed(false); }} className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${activeIdx === idx ? 'border-blue-600' : 'border-transparent opacity-60'}`}><img src={img} className="w-full h-full object-cover" /></button>))}</div>)}
                </div>

                {/* Zona Detalii */}
                <div className="w-full md:w-2/5 p-8 flex flex-col overflow-y-auto bg-white">
                    <div className="mb-6"><span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase">{product.category || "General"}</span><h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.title}</h2><div className="text-2xl font-bold text-green-600">{product.price}</div></div>
                    <div className="prose prose-sm text-gray-600 mb-8 border-t border-b border-gray-100 py-6"><h4 className="text-gray-900 font-bold mb-2">Descriere:</h4><p className="whitespace-pre-wrap">{product.description}</p></div>
                    
                    {/* --- ZONA CONTACT VÂNZĂTOR RESTAURATĂ --- */}
                    <div className="mt-auto bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Detalii Contact</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 mb-4">
                                {product.sellerAvatar && !avatarError ? (
                                    <img src={product.sellerAvatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" onError={() => setAvatarError(true)} />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl uppercase border-2 border-white shadow-sm">{product.seller.charAt(0)}</div>
                                )}
                                <div><div className="text-xs font-bold text-gray-400 uppercase">Vânzător</div><div className="font-medium text-lg text-gray-900">{product.seller}</div></div>
                            </div>
                            
                            {/* Numărul de telefon vizibil */}
                            {product.sellerPhone && (
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="bg-green-100 p-2 rounded-full text-green-700"><Phone className="w-5 h-5" /></div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">Telefon</div>
                                        <a href={`tel:${product.sellerPhone}`} className="font-mono text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors">{product.sellerPhone}</a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- LOGICA PRINCIPALĂ ---
export function CollectorsHubSection({ user, onOpenChat, initialPostId }: CollectorsHubProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  const [newProduct, setNewProduct] = useState({ title: '', price: '', category: 'Tricouri', images: [] as string[], description: '', phone: '' });
  
  const [productToShare, setProductToShare] = useState<Product | null>(null);

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
      } catch (err) { toast.error("Nu am putut încărca produsele."); } finally { setLoading(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) { Array.from(files).forEach(file => { const reader = new FileReader(); reader.onloadend = () => setNewProduct(p => ({ ...p, images: [...p.images, reader.result as string] })); reader.readAsDataURL(file); }); }
  };
  const removeImage = (i: number) => setNewProduct(p => ({...p, images: p.images.filter((_, idx) => idx !== i)}));

  const handleAddProduct = async () => {
    if (!newProduct.title) return toast.error("Titlu obligatoriu");
    if (!newProduct.price) return toast.error("Preț obligatoriu");
    if (!newProduct.phone) return toast.error("Telefon obligatoriu");
    if (newProduct.images.length === 0) return toast.error("Adaugă o poză!");

    setIsSubmitting(true);
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newProduct, seller: user.name, sellerEmail: user.email, sellerPhone: newProduct.phone, sellerAvatar: user.avatar })
        });
        if (res.ok) {
            setProducts([await res.json(), ...products]);
            setShowAddModal(false);
            setNewProduct({ title: '', price: '', category: 'Tricouri', images: [], description: '', phone: '' });
            toast.success("Anunț adăugat!");
        } else {
            const data = await res.json();
            toast.error(data.error || "Eroare la adăugare");
        }
    } catch (e) { toast.error("Eroare conexiune"); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
      if(!window.confirm("Ștergi?")) return;
      await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
      setProducts(products.filter(p => p._id !== id));
  };

  const handleStartChat = (product: Product) => {
      const roomId = `listing_${product._id}`;
      const partner = { name: product.seller, avatar: product.sellerAvatar };
      onOpenChat(roomId, partner);
      toast.success(`Chat deschis cu ${product.seller}`);
  };

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const titleMatch = (p.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'my_items' ? p.sellerEmail === user.email : true;
    const matchesCategory = selectedCategory === "Toate" ? true : p.category === selectedCategory;
    return titleMatch && matchesTab && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div><h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-2"><ShoppingBag className="text-blue-600" /> Collectors Hub</h2><p className="text-gray-500">Piața oficială pentru colecționarii echipei naționale.</p></div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('market')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'market' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Toate</button>
          <button onClick={() => setActiveTab('my_items')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'my_items' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><User className="w-4 h-4" /> Ale Mele</button>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-200"><Plus className="w-5 h-5" /> Vinde Produs</button>
      </div>

      <div className="space-y-4">
        <div className="relative"><Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" /><input type="text" placeholder="Caută..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{CATEGORIES.map((cat) => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{cat}</button>))}</div>
      </div>

      {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200"><Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" /><h3 className="text-lg font-bold text-gray-500">Niciun produs găsit.</h3></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
                <ProductCard 
                    key={product._id} 
                    product={product} 
                    user={user} 
                    onDelete={handleDelete} 
                    onClick={setSelectedProduct} 
                    onStartChat={handleStartChat} 
                    onShare={(p) => setProductToShare(p)} 
                />
            ))}
        </div>
      )}

      {selectedProduct && <ProductViewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onShare={(p) => setProductToShare(p)} />}

      {productToShare && <ShareModal product={productToShare} user={user} onClose={() => setProductToShare(null)} />}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0"><h3 className="text-xl font-bold">Vinde un articol</h3><button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Titlu <span className="text-red-500">*</span></label><input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Preț <span className="text-red-500">*</span></label><input type="text" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} /></div>
                  <div><label className="block text-sm font-bold text-gray-700 mb-1">Telefon <span className="text-red-500">*</span></label><input type="tel" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Categorie</label><select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>{CATEGORIES.filter(c => c !== "Toate").map(cat => (<option key={cat}>{cat}</option>))}</select></div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Imagini (Max 5) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                   {newProduct.images.map((img, idx) => (<div key={idx} className="relative aspect-square rounded-lg overflow-hidden border"><img src={img} className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><X className="w-3 h-3" /></button></div>))}
                   {newProduct.images.length < 5 && (<label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"><Upload className="w-6 h-6 text-gray-400" /><input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" /></label>)}
                </div>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">Descriere <span className="text-red-500">*</span></label><textarea className="w-full p-3 border rounded-xl h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea></div>
              
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm"/> : <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">{user.name.charAt(0)}</div>}
                  <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-bold uppercase">Postat de</span>
                      <span className="text-sm font-bold text-gray-800">{user.name}</span>
                  </div>
              </div>

              <button type="button" onClick={handleAddProduct} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2">{isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : 'Publică Anunțul'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}