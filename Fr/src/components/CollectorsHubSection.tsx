import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Tag, Trash2, User, Filter, X, Upload, ChevronLeft, ChevronRight, Phone } from 'lucide-react';

// --- INTERFEȚE ---
interface Product {
  id: number;
  title: string;
  price: string;
  category: string;
  images: string[]; // ACUM ESTE ARRAY (LISTĂ) DE IMAGINI
  description: string;
  seller: string;
  sellerEmail: string;
  sellerPhone: string; // CÂMP NOU
  date: string;
}

interface CollectorsHubProps {
  user: {
    name: string;
    email: string;
  };
}

const CATEGORIES = ["Toate", "Tricouri", "Fulare", "Bilete & Programe", "Suveniruri", "Echipament"];

// --- SUB-COMPONENTA: PRODUCT CARD (Cu Carusel) ---
// O facem separată ca să aibă fiecare produs propriul "state" pentru poza curentă
const ProductCard = ({ product, user, onDelete }: { product: Product, user: any, onDelete: (id: number) => void }) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const nextImage = () => {
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImgIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      
      {/* ZONA IMAGINE (CARUSEL) */}
      <div className="relative h-56 bg-gray-100 group-scope">
        {product.images.length > 0 ? (
          <img 
            src={product.images[currentImgIndex]} 
            alt={product.title} 
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-200">
            Fără imagine
          </div>
        )}

        {/* Categorie Badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-800 shadow-sm z-10">
          {product.category}
        </div>

        {/* BUTOANE NAVIGARE (Doar dacă sunt mai multe poze) */}
        {product.images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Indicator buline */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {product.images.map((_, idx) => (
                <div key={idx} className={`w-1.5 h-1.5 rounded-full shadow-sm ${idx === currentImgIndex ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* CONȚINUT */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-900 leading-tight">{product.title}</h3>
          <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap">{product.price}</span>
        </div>
        
        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>

        {/* INFO CONTACT & VÂNZĂTOR */}
        <div className="pt-4 border-t border-gray-50 mt-auto space-y-3">
          
          {/* Telefon (dacă există) */}
          {product.sellerPhone && (
             <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="font-mono font-medium">{product.sellerPhone}</span>
             </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                {product.seller.charAt(0)}
              </div>
              <span className="font-medium truncate max-w-[100px]">{product.seller}</span>
            </div>

            {product.sellerEmail === user.email ? (
              <button onClick={() => onDelete(product.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button className="text-blue-600 font-bold text-sm hover:underline">Contact</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- COMPONENTA PRINCIPALĂ ---
export function CollectorsHubSection({ user }: CollectorsHubProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");

  // State pentru formular (acum cu images array și phone)
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: 'Tricouri',
    images: [] as string[],
    description: '',
    phone: ''
  });

  // --- ÎNCĂRCARE & MIGRARE DATE VECHI ---
  useEffect(() => {
    const saved = localStorage.getItem('collectors_products');
    if (saved) {
      const loadedProducts = JSON.parse(saved);
      
      // Mapăm produsele ca să ne asigurăm că formatul e corect (pentru compatibilitate cu versiunea veche)
      const sanitizedProducts = loadedProducts.map((p: any) => ({
        ...p,
        // Dacă are 'image' string vechi, îl punem în array. Dacă are 'images', îl lăsăm așa.
        images: p.images ? p.images : (p.image ? [p.image] : []),
        sellerPhone: p.sellerPhone || ''
      })).filter((p: any) => p.id !== 1 && p.id !== 2); // Eliminăm demo vechi

      setProducts(sanitizedProducts);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('collectors_products', JSON.stringify(products));
  }, [products]);

  // --- LOGICA ÎNCĂRCARE IMAGINI MULTIPLE ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Limităm la 5 poze per produs
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
          setNewProduct(prev => ({
            ...prev,
            images: [...prev.images, reader.result as string]
          }));
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

  const handleAddProduct = () => {
    if (!newProduct.title.trim() || !newProduct.price.trim() || !newProduct.description.trim() || !newProduct.phone.trim()) {
      alert("Te rog completează toate câmpurile, inclusiv numărul de telefon!");
      return;
    }
    
    if (newProduct.images.length === 0) {
      alert("Te rog adaugă cel puțin o poză!");
      return;
    }

    const product: Product = {
      id: Date.now(),
      title: newProduct.title,
      price: newProduct.price,
      category: newProduct.category,
      images: newProduct.images,
      description: newProduct.description,
      sellerPhone: newProduct.phone,
      seller: user.name,
      sellerEmail: user.email,
      date: new Date().toISOString().split('T')[0]
    };

    setProducts([product, ...products]);
    setShowAddModal(false);
    // Reset form
    setNewProduct({ title: '', price: '', category: 'Tricouri', images: [], description: '', phone: '' });
    setActiveTab('my_items');
    setSelectedCategory("Toate");
    alert("Anunțul a fost publicat!");
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Ștergi acest produs?")) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'my_items' ? p.sellerEmail === user.email : true;
    const matchesCategory = selectedCategory === "Toate" ? true : p.category === selectedCategory;
    return matchesSearch && matchesTab && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
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

      {/* FILTRE */}
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

      {/* LISTA PRODUSE */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-500">Niciun produs găsit.</h3>
          <p className="text-sm text-gray-400">{products.length === 0 ? "Nu există încă produse la vânzare." : "Încearcă să schimbi filtrele."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} user={user} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* MODAL ADĂUGARE PRODUS */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Vinde un articol</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Titlu Produs</label>
                <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Tricou Națională" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preț</label>
                  <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 150 RON" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telefon</label>
                  <input type="tel" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="07xx xxx xxx" value={newProduct.phone} onChange={e => setNewProduct({...newProduct, phone: e.target.value})} />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-1">Categorie</label>
                 <select className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORIES.filter(c => c !== "Toate").map(cat => (<option key={cat}>{cat}</option>))}
                 </select>
              </div>

              {/* UPLOAD IMAGINI MULTIPLE */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Imagini (Max 5)</label>
                
                {/* Grid previzualizare imagini */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                   {newProduct.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                         <img src={img} alt="preview" className="w-full h-full object-cover" />
                         <button 
                            type="button" 
                            onClick={() => removeImage(idx)} 
                            className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full hover:bg-red-600"
                         >
                            <X className="w-3 h-3" />
                         </button>
                      </div>
                   ))}
                   
                   {/* Buton Upload (Dacă nu am atins limita) */}
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Descriere</label>
                <textarea className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" placeholder="Detalii..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 text-sm text-blue-800">
                <User className="w-5 h-5" />
                <span>Vei posta ca: <strong>{user.name}</strong></span>
              </div>

              <button type="button" onClick={handleAddProduct} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30">
                Publică Anunțul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}