import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingBag, Plus, Search, Tag, Trash2, User, X, Upload,
  ChevronLeft, ChevronRight, Phone, Maximize2, AlertTriangle,
  Loader2, MessageCircle, Share2, Copy, Send, Heart, Flag,
  Shield, FileText, ZoomIn, ZoomOut, RotateCcw, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SkeletonCard } from './SkeletonCard';

// --- UTILITAR COMPRESIE IMAGINI (ÎNAINTE DE UPLOAD) ---
async function compressImage(file: File, maxWidth = 1200, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context indisponibil'));

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

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
  onOpenChat: (roomId: string, partner: { name: string; avatar?: string }) => void;
  initialPostId?: string | null;
}

const CATEGORIES = ["Toate", "Tricouri", "Fulare", "Bilete & Programe", "Suveniruri", "Echipament"];
const BACKEND_BASE = (import.meta as any).env?.VITE_API_URL || 'https://football-backend-m2a4.onrender.com';
const API_URL = `${BACKEND_BASE}/api/listings`;

// --- COMPONENTA ZOOM PENTRU FOTOGRAFII (DESKTOP +/- ȘI MOBIL TOUCH/PINCH) ---
function FullscreenPhotoZoom({
  images,
  activeIdx,
  onChangeIdx,
  title,
  onClose,
}: {
  images: string[];
  activeIdx: number;
  onChangeIdx: (nextIdx: number) => void;
  title: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  const currentSrc = images[activeIdx];

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [activeIdx, currentSrc]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const clampScale = (val: number) => Math.min(4, Math.max(1, Number(val.toFixed(2))));

  const handleZoomIn = () => setScale((prev) => clampScale(prev + 0.5));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = clampScale(prev - 0.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = clampScale(prev + delta);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsDragging(false);
      pinchStartDistRef.current = getTouchDistance(e.touches);
      pinchStartScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches);
      const nextScale = clampScale(pinchStartScaleRef.current * (dist / pinchStartDistRef.current));
      setScale(nextScale);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDistRef.current = null;
    if (e.touches.length === 0) setIsDragging(false);
  };

  if (!currentSrc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000000] bg-black/90 backdrop-blur-sm flex flex-col justify-between p-3 sm:p-5 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0 bg-[#11161D] border border-white/[0.08] px-3 py-1.5 rounded-lg">
          <span className="text-xs font-medium text-slate-200 truncate">{title}</span>
          <span className="text-xs font-semibold text-emerald-400 tabular-nums shrink-0">{Math.round(scale * 100)}%</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Micșorează"
            className="p-2 rounded-lg bg-[#11161D] hover:bg-white/[0.08] disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="Mărește"
            className="p-2 rounded-lg bg-[#11161D] hover:bg-white/[0.08] disabled:opacity-40 text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Resetează (1x)"
            className="p-2 rounded-lg bg-[#11161D] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Închide"
            className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 transition-colors ml-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClose}
        style={{ touchAction: 'none' }}
        className="relative flex-1 w-full max-w-5xl mx-auto my-3 rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden flex items-center justify-center"
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIdx((activeIdx - 1 + images.length) % images.length);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 bg-[#11161D]/90 hover:bg-[#1A222C] text-white p-2 rounded-full transition-colors border border-white/[0.1] cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={currentSrc}
          alt={title}
          draggable={false}
          onMouseDown={handleMouseDown}
          onClick={(e) => {
            e.stopPropagation();
            if (scale === 1) setScale(2);
          }}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          className="max-h-[75dvh] max-w-full object-contain transition-transform duration-150 ease-out"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeIdx((activeIdx + 1) % images.length);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 bg-[#11161D]/90 hover:bg-[#1A222C] text-white p-2 rounded-full transition-colors border border-white/[0.1] cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 text-center z-20">
        Desktop: folosește + / - sau rotița • Mobil: pinch sau glisează
      </p>
    </div>,
    document.body
  );
}

// --- COMPONENTA PRINCIPALĂ ---
export function CollectorsHubSection({ user, onOpenChat, initialPostId }: CollectorsHubProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items' | 'favorites'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: 'Tricouri',
    images: [] as string[],
    description: '',
    phone: '',
  });

  const [productToShare, setProductToShare] = useState<Product | null>(null);
  const [userFavorites, setUserFavorites] = useState<string[]>(user?.favorites || []);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setActiveIdx(0);
    setIsFullscreen(false);
    setAvatarError(false);
  }, [selectedProduct?._id]);

  useEffect(() => {
    if (initialPostId && products.length > 0) {
      const foundProduct = products.find((p) => p._id === initialPostId);
      if (foundProduct) {
        setSelectedProduct(foundProduct);
        toast.success("Produsul a fost deschis.");
      }
    }
  }, [products, initialPostId]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Eroare server");
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {
      toast.error("Nu s-au putut încărca anunțurile.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - newProduct.images.length;
    if (remainingSlots <= 0) {
      toast.error("Poți adăuga maxim 5 imagini.");
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    setIsCompressingImages(true);

    try {
      const compressedList: string[] = [];
      for (const file of selectedFiles) {
        try {
          const compressed = await compressImage(file, 1200, 0.78);
          compressedList.push(compressed);
        } catch {
          toast.error(`Nu s-a putut procesa imaginea ${file.name}`);
        }
      }

      if (compressedList.length > 0) {
        setNewProduct((p) => ({
          ...p,
          images: [...p.images, ...compressedList].slice(0, 5),
        }));
      }
    } finally {
      setIsCompressingImages(false);
      e.target.value = '';
    }
  };

  const removeImage = (i: number) =>
    setNewProduct((p) => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }));

  const handleAddProduct = async () => {
    if (!newProduct.title) return toast.error("Introdu un titlu pentru anunț.");
    if (!newProduct.price) return toast.error("Introdu prețul articolului.");
    if (!newProduct.phone) return toast.error("Introdu un număr de telefon.");
    if (newProduct.images.length === 0) return toast.error("Adaugă cel puțin o fotografie.");

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
          sellerAvatar: user.avatar,
        }),
      });
      if (res.ok) {
        setProducts([await res.json(), ...products]);
        setShowAddModal(false);
        setNewProduct({ title: '', price: '', category: 'Tricouri', images: [], description: '', phone: '' });
        toast.success("Anunțul a fost publicat.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Eroare la publicare.");
      }
    } catch {
      toast.error("Eroare de conexiune.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Ștergi definitiv acest anunț?")) return;
    await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    });
    setProducts(products.filter((p) => p._id !== id));
    if (selectedProduct?._id === id) setSelectedProduct(null);
    toast.success("Anunț șters.");
  };

  const handleStartChat = (product: Product) => {
    const roomId = `listing_${product._id}`;
    const partner = { name: product.seller, avatar: product.sellerAvatar };
    onOpenChat(roomId, partner);
    toast.success(`Conversație deschisă cu ${product.seller}.`);
  };

  const handleToggleFavorite = async (listingId: string) => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/users/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, listingId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserFavorites(data.favorites);
        if (data.favorites.includes(listingId)) {
          toast.success("Salvat la favorite.");
        } else {
          toast("Eliminat din favorite.");
        }
      }
    } catch {
      toast.error("Eroare la procesare.");
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const titleMatch = (p.title || "").toLowerCase().includes(searchTerm.toLowerCase());

    let matchesTab = true;
    if (activeTab === 'my_items') matchesTab = p.sellerEmail === user.email;
    if (activeTab === 'favorites') matchesTab = userFavorites.includes(p._id);

    const matchesCategory = selectedCategory === "Toate" ? true : p.category === selectedCategory;
    return titleMatch && matchesTab && matchesCategory;
  });

  // --- CARD PRODUS ---
  const ProductCard = ({ product, isFavorite }: { product: Product; isFavorite: boolean }) => {
    const [currentImgIndex, setCurrentImgIndex] = useState(0);
    const images = product.images || [];
    const sellerName = product.seller || "Necunoscut";
    const [localAvatarError, setLocalAvatarError] = useState(false);
    const isOwner = product.sellerEmail === user.email;

    return (
      <div
        onClick={() => setSelectedProduct(product)}
        className="group bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] hover:border-emerald-500/40 overflow-hidden transition-colors flex flex-col h-full cursor-pointer relative"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite(product._id);
          }}
          className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg transition-colors border cursor-pointer ${
            isFavorite
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
              : 'bg-black/50 backdrop-blur-sm border-white/10 text-white/80 hover:text-rose-400'
          }`}
          title="Salvează la favorite"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        <div className="relative h-48 sm:h-52 bg-slate-100 dark:bg-[#0B0F14] border-b border-slate-200 dark:border-white/[0.06] overflow-hidden shrink-0">
          {images.length > 0 ? (
            <img
              src={images[currentImgIndex]}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 sm:group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Eroare+Imagine';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <AlertTriangle className="w-6 h-6 mb-1.5 opacity-50" />
              <span className="text-xs">Fără imagine</span>
            </div>
          )}

          <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-slate-100 px-2 py-0.5 rounded-md text-[10px] font-medium z-10 border border-white/10">
            {product.category || "General"}
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (images.length > 0) setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (images.length > 0) setCurrentImgIndex((prev) => (prev + 1) % images.length);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="absolute bottom-2.5 left-2.5 flex gap-1 z-10 bg-black/50 backdrop-blur-sm px-1.5 py-1 rounded-full">
                {images.map((_, i) => (
                  <div key={i} className={`w-1 h-1 rounded-full ${i === currentImgIndex ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug group-hover:text-emerald-500 transition-colors line-clamp-2 mb-1" title={product.title}>
            {product.title || "Fără titlu"}
          </h3>

          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mb-2 tabular-nums">
            {product.price || "N/A"}
          </div>

          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4 line-clamp-2 flex-1">
            {product.description || "Fără descriere."}
          </p>

          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] mt-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {product.sellerAvatar && !localAvatarError ? (
                <img
                  src={product.sellerAvatar}
                  alt={sellerName}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-white/[0.1] shrink-0 bg-white"
                  onError={() => setLocalAvatarError(true)}
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs shrink-0">
                  {sellerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium text-xs truncate text-slate-700 dark:text-slate-300">
                {sellerName}
              </span>
            </div>

            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProductToShare(product);
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.07] p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Distribuie anunțul"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>

              {!isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartChat(product);
                  }}
                  className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Trimite mesaj"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(product._id);
                  }}
                  className="text-rose-500 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Șterge anunțul"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- MODAL SHARE ---
  const ShareModalComponent = ({ product }: { product: Product }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [copied, setCopied] = useState(false);

    const shareUrl = `${window.location.origin}/?postId=${product._id}`;

    useEffect(() => {
      const fetchConversations = async () => {
        try {
          const res = await fetch(`${BACKEND_BASE}/api/messages/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, name: user.name }),
          });
          if (res.ok) setConversations(await res.json());
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingConvs(false);
        }
      };
      fetchConversations();
    }, [user.email, user.name]);

    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link copiat în clipboard.");
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast.error("Nu s-a putut copia link-ul.");
      }
    };

    const handleExternalShare = async () => {
      const shareData = {
        title: `România Scout: ${product.title}`,
        text: `Uite ce am găsit în Fanshop: ${product.title} - ${product.price}`,
        url: shareUrl,
      };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await handleCopyLink();
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          await handleCopyLink();
        }
      }
    };

    const handleSendToChat = async (roomId: string, chatTitle: string) => {
      const messageText = `Anunț Fanshop:\n${product.title} (${product.price})\nVezi detalii: ${shareUrl}`;
      const now = new Date();
      const time = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;

      try {
        const res = await fetch(`${BACKEND_BASE}/api/messages/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            room: roomId,
            author: user.name,
            authorRole: user.role === 'admin' ? 'admin' : 'user',
            message: messageText,
            time,
          }),
        });

        if (res.ok) {
          toast.success(`Trimis către ${chatTitle}.`);
          setProductToShare(null);
        } else {
          toast.error("Nu s-a putut trimite mesajul.");
        }
      } catch {
        toast.error("Eroare la trimitere.");
      }
    };

    return createPortal(
      <div
        onClick={() => setProductToShare(null)}
        className="fixed inset-0 z-[1000001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#11161D] w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/[0.08]"
        >
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-500" /> Distribuie anunțul
            </h3>
            <button
              type="button"
              onClick={() => setProductToShare(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex gap-3 bg-slate-50 dark:bg-[#0B0F14] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.07]">
              {product.images[0] ? (
                <img src={product.images[0]} alt={product.title} className="w-12 h-12 rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-slate-200 dark:bg-white/[0.05] rounded-md flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">{product.title}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 tabular-nums">{product.price}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0B0F14] p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08]">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none px-1.5 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white/[0.08] hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiat' : 'Copiază'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleExternalShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium text-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" /> Trimite prin aplicații externe
            </button>

            <div className="pt-3 border-t border-slate-200 dark:border-white/[0.07] space-y-2">
              <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Trimite în chat-ul intern
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {loadingConvs ? (
                  <div className="text-center text-xs text-slate-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-500" /> Se încarcă conversațiile...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center text-xs text-slate-500 py-4 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-lg">
                    Nu ai conversații active încă.
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      type="button"
                      key={conv.roomId}
                      onClick={() => handleSendToChat(conv.roomId, conv.title)}
                      className="w-full flex items-center gap-2.5 p-2 bg-slate-50 dark:bg-[#0B0F14] hover:border-emerald-500/40 border border-slate-200 dark:border-white/[0.07] rounded-lg transition-colors text-left group cursor-pointer"
                    >
                      {conv.image ? (
                        <img src={conv.image} alt={conv.title} className="w-8 h-8 rounded-md object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 text-xs font-semibold shrink-0">
                          CH
                        </div>
                      )}
                      <div className="flex-1 truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                        {conv.title}
                      </div>
                      <Send className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="min-h-[75vh] pb-16">
      {/* Header Market */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.07] p-4 sm:p-5 rounded-xl mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
              Fanshop Market
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anunțuri de la colecționari și pasionați de fotbal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <div className="flex bg-slate-100 dark:bg-white/[0.04] p-1 rounded-lg border border-slate-200/80 dark:border-white/[0.06] flex-1 lg:flex-none">
            <button
              type="button"
              onClick={() => setActiveTab('market')}
              className={`flex-1 lg:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'market'
                  ? 'bg-white dark:bg-[#1A222C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Toate
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 lg:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'favorites'
                  ? 'bg-white dark:bg-[#1A222C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === 'favorites' ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
              Favorite
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my_items')}
              className={`flex-1 lg:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'my_items'
                  ? 'bg-white dark:bg-[#1A222C] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Anunțurile mele
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adaugă anunț
          </button>
        </div>
      </div>

      {/* Căutare și Categorii */}
      <div className="space-y-3 mb-6">
        <div className="relative bg-white dark:bg-[#11161D] border border-slate-200 dark:border-white/[0.08] focus-within:border-emerald-500/60 rounded-xl flex items-center transition-colors">
          <Search className="w-4 h-4 text-slate-400 ml-3.5 shrink-0" />
          <input
            type="text"
            placeholder="Caută tricouri, fulare, bilete..."
            className="w-full py-2.5 px-3 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="p-1.5 mr-2 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-white/[0.1] text-white border-slate-900 dark:border-white/[0.15]'
                  : 'bg-white dark:bg-[#11161D] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Produse */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-[#11161D] rounded-xl border border-slate-200 dark:border-white/[0.07] max-w-md mx-auto px-6">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
            {activeTab === 'favorites' ? (
              <Heart className="w-5 h-5 text-rose-500" />
            ) : (
              <Tag className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
            {activeTab === 'favorites' ? 'Niciun anunț salvat' : 'Niciun anunț disponibil'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            {activeTab === 'favorites'
              ? 'Apasă pe inimă pentru a salva articolele care te interesează.'
              : 'Nu există produse care să corespundă căutării tale.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              isFavorite={userFavorites.includes(product._id)}
            />
          ))}
        </div>
      )}

      {/* MODAL SHARE */}
      {productToShare && <ShareModalComponent product={productToShare} />}

      {/* MODAL VIZUALIZARE PRODUS */}
      {selectedProduct &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => setSelectedProduct(null)}>
            <div className="bg-white dark:bg-[#0B0F14] w-full h-[100dvh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] sm:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl sm:border border-slate-200 dark:border-white/[0.08] relative" onClick={(e) => e.stopPropagation()}>
              {/* Acțiuni colț dreapta sus */}
              <div className="absolute top-3 right-3 z-50 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(selectedProduct._id)}
                  className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-lg border border-white/10 transition-colors cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${userFavorites.includes(selectedProduct._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setProductToShare(selectedProduct)}
                  className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white p-2 rounded-lg border border-white/10 transition-colors cursor-pointer"
                  title="Distribuie anunțul"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="bg-black/60 backdrop-blur-sm hover:bg-rose-600 text-white p-2 rounded-lg border border-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Galerie Foto */}
              <div className="w-full h-[38vh] md:h-auto md:w-3/5 bg-slate-100 dark:bg-[#11161D] flex flex-col relative border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/[0.07] shrink-0">
                <div
                  className="flex-1 relative overflow-hidden flex items-center justify-center cursor-zoom-in p-3"
                  onClick={() => {
                    if (selectedProduct.images.length > 0) setIsFullscreen(true);
                  }}
                >
                  {selectedProduct.images.length > 0 ? (
                    <img
                      src={selectedProduct.images[activeIdx]}
                      alt={selectedProduct.title}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center text-xs">
                      <AlertTriangle className="mb-1.5 w-6 h-6" /> Fără fotografie
                    </div>
                  )}
                </div>

                {selectedProduct.images.length > 1 && (
                  <div className="p-2.5 bg-slate-200/60 dark:bg-[#0B0F14] border-t border-slate-200 dark:border-white/[0.07] flex gap-2 overflow-x-auto justify-center">
                    {selectedProduct.images.map((img, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setActiveIdx(idx)}
                        className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-opacity cursor-pointer ${
                          activeIdx === idx ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-55 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isFullscreen && selectedProduct.images.length > 0 && (
                <FullscreenPhotoZoom
                  images={selectedProduct.images}
                  activeIdx={activeIdx}
                  onChangeIdx={setActiveIdx}
                  title={selectedProduct.title}
                  onClose={() => setIsFullscreen(false)}
                />
              )}

              {/* Detalii produs */}
              <div className="w-full md:w-2/5 p-5 sm:p-6 flex flex-col flex-1 overflow-y-auto bg-white dark:bg-[#0B0F14]">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-md mb-2 border border-slate-200 dark:border-white/[0.07]">
                    <Tag className="w-3 h-3" /> {selectedProduct.category || "General"}
                  </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-snug mb-2">
                    {selectedProduct.title}
                  </h2>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {selectedProduct.price}
                  </div>
                </div>

                <div className="mb-5 border-t border-b border-slate-200 dark:border-white/[0.07] py-4">
                  <h4 className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Descriere
                  </h4>
                  <p className="whitespace-pre-wrap text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedProduct.description}
                  </p>
                </div>

                <div className="mt-auto bg-slate-50 dark:bg-[#11161D] rounded-xl p-4 border border-slate-200 dark:border-white/[0.07] relative">
                  {selectedProduct.sellerEmail !== user.email && user?.role !== 'admin' && user?.email !== 'admin.nou@scout.ro' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm("Raportezi acest anunț către administratori?")) return;
                        try {
                          const res = await fetch(`${API_URL}/${selectedProduct._id}/report`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user: user.name }),
                          });
                          if (res.ok) toast.success("Anunțul a fost raportat.");
                        } catch {
                          toast.error("Eroare la raportare.");
                        }
                      }}
                      className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                      title="Raportează anunțul"
                    >
                      <Flag className="w-3 h-3" /> Raportează
                    </button>
                  )}

                  <h3 className="font-medium text-xs text-slate-500 mb-3">Vânzător</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {selectedProduct.sellerAvatar && !avatarError ? (
                        <img
                          src={selectedProduct.sellerAvatar}
                          alt={selectedProduct.seller}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-white/[0.1]"
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                          {selectedProduct.seller.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {selectedProduct.seller}
                        </div>
                        <div className="text-[11px] text-slate-500">Membru Fanshop</div>
                      </div>
                    </div>

                    {selectedProduct.sellerPhone && (
                      <a
                        href={`tel:${selectedProduct.sellerPhone}`}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 px-4 rounded-lg transition-colors w-full text-xs font-medium tabular-nums"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedProduct.sellerPhone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODAL ADĂUGARE PRODUS */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white dark:bg-[#11161D] sm:rounded-xl w-full h-[100dvh] sm:h-auto sm:max-w-lg shadow-2xl flex flex-col sm:max-h-[90vh] sm:border border-slate-200 dark:border-white/[0.08] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.07] flex justify-between items-center shrink-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-500" /> Adaugă anunț nou
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Titlu articol <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] rounded-lg outline-none focus:border-emerald-500 text-sm text-slate-900 dark:text-white"
                    placeholder="Ex: Tricou Hagi 1994"
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Preț <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] rounded-lg outline-none focus:border-emerald-500 text-sm text-slate-900 dark:text-white"
                      placeholder="Ex: 500 RON"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Telefon <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] rounded-lg outline-none focus:border-emerald-500 text-sm text-slate-900 dark:text-white"
                      placeholder="07XX..."
                      value={newProduct.phone}
                      onChange={(e) => setNewProduct({ ...newProduct, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Categorie
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] rounded-lg outline-none focus:border-emerald-500 text-sm text-slate-900 dark:text-white cursor-pointer"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    {CATEGORIES.filter((c) => c !== "Toate").map((cat) => (
                      <option key={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Imagini (maxim 5) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.1]">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-black/70 text-white p-0.5 rounded hover:bg-rose-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {newProduct.images.length < 5 && (
                      <label className="aspect-square border border-dashed border-slate-300 dark:border-white/[0.15] bg-slate-50 dark:bg-[#0B0F14] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:text-emerald-500 transition-colors text-slate-400">
                        {isCompressingImages ? (
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mb-1" />
                            <span className="text-[10px] font-medium">Încarcă</span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={isCompressingImages}
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Descriere <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#0B0F14] border border-slate-200 dark:border-white/[0.08] rounded-lg h-24 outline-none focus:border-emerald-500 text-sm text-slate-900 dark:text-white resize-y"
                    placeholder="Stare, mărime, detalii..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-white/[0.07] shrink-0">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={isSubmitting || isCompressingImages}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Publică anunțul'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}