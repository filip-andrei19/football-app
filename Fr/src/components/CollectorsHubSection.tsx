import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Tag, Trash2, User, X, Upload, ChevronLeft, ChevronRight, Phone, Maximize2, ZoomIn, Loader2, AlertTriangle } from 'lucide-react';

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
  posted: string; 
}

interface CollectorsHubProps {
  user: {
    name: string;
    email: string;
  };
}

const CATEGORIES = ["Toate", "Tricouri", "Fulare", "Bilete & Programe", "Suveniruri", "Echipament"];
// URL-ul Backend-ului
const API_URL = 'https://football-backend-m2a4.onrender.com/api/listings'; 

// --- 1. COMPONENTA: PRODUCT CARD (VARIANTA BLINDATĂ) ---
const ProductCard = ({ product, user, onDelete, onClick }: { product: Product, user: any, onDelete: (id: string) => void, onClick: (p: Product) => void }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // PROTECȚIE: Dacă datele lipsesc, punem valori implicite
  const images = product.images || [];
  const sellerName = product.seller || "Necunoscut";

  const nextImage = () => {
    if (images.length > 0) setCurrentImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length > 0) setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div 
      onClick={() => onClick(product)}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer relative"
    >
      <div className="absolute top-3 left-3 z-20 bg-black/50 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <Maximize2 className="w-4 h-4" />
      </div>

      <div className="relative h-64 bg-gray-100">
        {images.length > 0 ? (
          <img 
            src={images[currentImgIndex]} 
            alt={product.title || "Produs"} 
            className="w-full h-full object-cover transition-transform duration-500"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Eroare+Imagine' }} 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-200 p-4 text-center">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">Fără imagine</span>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-800 shadow-sm z-10">
          {product.category || "General"}
        </div>

        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
            {product.title || "Fără Titlu"}
          </h3>
          <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap">
            {product.price || "N/A"}
          </span>
        </div>
        
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
            {product.description || "Fără descriere."}
        </p>

        <div className="pt-4 border-t border-gray-50 mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase shadow-sm border border-white">
                {sellerName.charAt(0)}
              </div>
              <div className="flex flex-col leading-none">
                 <span className="text-[10px] text-gray-400">Vânzător</span>
                 <span className="font-medium truncate max-w-[100px]">{sellerName}</span>
              </div>
            </div>

            {product.sellerEmail === user.email && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(product._id); }} 
                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors z-20 relative"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
        </div>
      </div>
    </div>
  );
};

// --- 2. COMPONENTA: VIZUALIZARE PRODUS (MODAL) ---
const ProductViewModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [isZoomed, setIsZoomed] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const images = product.images || [];

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isZoomed) return;
        const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - left) / width) * 100;
        const y = ((e.clientY - top) / height) * 100;
        setMousePos({ x, y });
    };

    const toggleZoom = (e: React.MouseEvent) => {
        if (!isZoomed) {
             const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
             const x = ((e.clientX - left) / width) * 100;
             const y = ((e.clientY - top) / height) * 100;
             setMousePos({ x, y });
        }
        setIsZoomed(!isZoomed);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95 duration-300 relative">
                
                <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-white/80 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg transition-all">
                    <X className="w-6 h-6" />
                </button>

                <div className="w-full md:w-3/5 bg-gray-100 flex flex-col relative h-[50vh] md:h-auto border-r border-gray-100">
                    <div 
                        className={`flex-1 relative overflow-hidden flex items-center justify-center bg-white ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                        onMouseMove={handleMouseMove}
                        onClick={toggleZoom}
                        onMouseLeave={() => setIsZoomed(false)}
                    >
                        {images.length > 0 ? (
                             <img 
                                src={images[activeIdx]} 
                                alt="Full view" 
                                className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
                                style={{
                                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                                    transform: isZoomed ? 'scale(2.5)' : 'scale(1)'
                                }}
                            />
                        ) : (
                            <div className="text-gray-400 flex flex-col items-center"><AlertTriangle className="mb-2"/> Fără imagine</div>
                        )}
                        
                        {!isZoomed && images.length > 0 && (
                            <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 pointer-events-none backdrop-blur-sm">
                                <ZoomIn className="w-3 h-3" /> Click pentru Zoom
                            </div>
                        )}
                    </div>
                    
                    {images.length > 1 && (
                        <div className="p-4 bg-white border-t border-gray-100 flex gap-3 overflow-x-auto justify-center z-40 relative">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => { setActiveIdx(idx); setIsZoomed(false); }}
                                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${activeIdx === idx ? 'border-blue-600 ring-2 ring-blue-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-2/5 p-8 flex flex-col overflow-y-auto bg-white">
                    <div className="mb-6">
                        <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                            {product.category || "General"}
                        </span>
                        <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.title || "Fără Titlu"}</h2>
                        <div className="text-2xl font-bold text-green-600">{product.price || "N/A"}</div>
                        <div className="text-xs text-gray-400 mt-1">
                            Postat pe: {product.posted ? new Date(product.posted).toLocaleDateString('ro-RO') : "Dată necunoscută"}
                        </div>
                    </div>

                    <div className="prose prose-sm text-gray-600 mb-8 border-t border-b border-gray-100 py-6">
                        <h4 className="text-gray-900 font-bold mb-2">Descriere Vânzător:</h4>
                        <p className="whitespace-pre-wrap leading-relaxed">{product.description || "Fără descriere."}</p>
                    </div>

                    <div className="mt-auto bg-gray-50 rounded-2xl p-6 border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Detalii Contact
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase">Vânzător</div>
                                <div className="font-medium text-lg text-gray-900">{product.seller || "Necunoscut"}</div>
                            </div>

                            {product.sellerPhone ? (
                                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="bg-green-100 p-2 rounded-full text-green-700">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-400 uppercase">Telefon</div>
                                        <a href={`tel:${product.sellerPhone}`} className="font-mono text-lg font-bold text-gray-900 hover:text-green-600 transition-colors">
                                            {product.sellerPhone}
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 italic">
                                    Acest vânzător nu a lăsat un număr de telefon.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- 3. COMPONENTA PRINCIPALĂ ---
export function CollectorsHubSection({ user }: CollectorsHubProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");

  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: 'Tricouri',
    images: [] as string[],
    description: '',
    phone: ''
  });

  // --- FETCH DATA DIN BACKEND ---
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
      try {
          const res = await fetch(API_URL);
          if (!res.ok) throw new Error("Eroare server");
          
          const data = await res.json();
          
          if (Array.isArray(data)) {
              setProducts(data);
          } else {
              setProducts([]);
          }
      } catch (err) {
          console.error("Eroare la încărcare produse:", err);
          setProducts([]); 
      } finally {
          setLoading(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (newProduct.images.length + files.length > 5) {
        alert("Poți încărca maxim 5 poze!");
        return;
      }
      Array.from(files).forEach(file => {
        if (file.size > 2 * 1024 * 1024) {
          alert(`Fișierul ${file.name} este prea mare (Max 2MB).`);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setNewProduct(prev => ({ ...prev, images: [...prev.images, reader.result as string] }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setNewProduct(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleAddProduct = async () => {
    // ------------------------------------------------------------------
    // AICI ESTE VALIDAREA STRICTĂ NOUĂ
    // Dacă oricare dintre aceste condiții e adevărată, oprim funcția.
    // ------------------------------------------------------------------
    if (!newProduct.title.trim()) {
        alert("Te rog adaugă un Titlu pentru produs!");
        return;
    }
    if (!newProduct.price.trim()) {
        alert("Te rog adaugă un Preț!");
        return;
    }
    if (!newProduct.phone.trim()) {
        alert("Te rog adaugă un Număr de Telefon valid!");
        return;
    }
    if (newProduct.images.length === 0) {
        alert("Te rog adaugă cel puțin o Poză! Oamenii vor să vadă produsul.");
        return;
    }
    if (!newProduct.description.trim()) {
        alert("Te rog adaugă o Descriere!");
        return;
    }

    setIsSubmitting(true);

    try {
        const payload = {
            title: newProduct.title,
            price: newProduct.price,
            category: newProduct.category,
            images: newProduct.images,
            description: newProduct.description,
            seller: user.name,
            sellerEmail: user.email,
            sellerPhone: newProduct.phone
        };

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const savedProduct = await res.json();
            setProducts([savedProduct, ...products]); 
            setShowAddModal(false);
            setNewProduct({ title: '', price: '', category: 'Tricouri', images: [], description: '', phone: '' });
            alert("Anunțul a fost publicat!");
            setActiveTab('my_items');
            setSelectedCategory("Toate");
        } else {
            alert("Eroare la salvare pe server.");
        }
    } catch (err) {
        alert("Eroare de conexiune.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Ștergi acest produs?")) {
      try {
          const res = await fetch(`${API_URL}/${id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: user.email })
          });

          if (res.ok) {
              setProducts(products.filter(p => p._id !== id));
              if (selectedProduct?._id === id) setSelectedProduct(null);
          } else {
              alert("Nu ai permisiunea să ștergi acest produs.");
          }
      } catch (err) {
          alert("Eroare la ștergere.");
      }
    }
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
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" /> Collectors Hub
          </h2>
          <p className="text-gray-500">Piața oficială pentru colecționarii echipei naționale.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setActiveTab('market')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'market' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Toate</button>
          <button onClick={() => setActiveTab('my_items')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'my_items' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><User className="w-4 h-4" /> Ale Mele</button>
        </div>

        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-200">
          <Plus className="w-5 h-5" /> Vinde Produs
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input type="text" placeholder="Caută tricouri, fulare, bilete..." className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{cat}</button>
          ))}
        </div>
      </div>

      {loading ? (
          <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-500">Niciun produs găsit.</h3>
          <p className="text-sm text-gray-400">{products.length === 0 ? "Nu există încă produse la vânzare." : "Încearcă să schimbi filtrele."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard 
                key={product._id} 
                product={product} 
                user={user} 
                onDelete={handleDelete}
                onClick={setSelectedProduct}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
          <ProductViewModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Vinde un articol</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Titlu Produs <span className="text-red-500">*</span></label>
                <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Tricou Națională" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preț <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 150 RON" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefon <span className="text-red-500">*</span></label>
                  <input type="tel" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="07xx xxx xxx" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Categorie</label>
                 <select className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORIES.filter(c => c !== "Toate").map(cat => (<option key={cat}>{cat}</option>))}
                 </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Imagini (Min 1, Max 5) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                   {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                         <img src={img} alt="preview" className="w-full h-full object-cover" />
                         <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button>
                      </div>
                   ))}
                   {newProduct.images.length < 5 && (
                      <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                         <Upload className="w-6 h-6 text-gray-400 mb-1" />
                         <span className="text-xs text-gray-500">Adaugă</span>
                         <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                   )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descriere <span className="text-red-500">*</span></label>
                <textarea className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" placeholder="Detalii..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 text-sm text-blue-800">
                <User className="w-5 h-5" />
                <span>Vei posta ca: <strong>{user.name}</strong></span>
              </div>

              <button 
                  type="button" 
                  onClick={handleAddProduct} 
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Se publică...' : 'Publică Anunțul'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}