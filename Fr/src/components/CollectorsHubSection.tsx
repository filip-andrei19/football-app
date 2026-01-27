import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Tag, Trash2, User, Filter, X, Image as ImageIcon, Upload } from 'lucide-react';

// Interfața pentru un produs
interface Product {
  id: number;
  title: string;
  price: string;
  category: string;
  image: string;
  description: string;
  seller: string;
  sellerEmail: string;
  date: string;
}

interface CollectorsHubProps {
  user: {
    name: string;
    email: string;
  };
}

const CATEGORIES = ["Toate", "Tricouri", "Fulare", "Bilete & Programe", "Suveniruri", "Echipament"];

export function CollectorsHubSection({ user }: CollectorsHubProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toate");

  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: 'Tricouri',
    image: '',
    description: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('collectors_products');
    if (saved) {
      const loadedProducts = JSON.parse(saved);
      const cleanProducts = loadedProducts.filter((p: Product) => p.id !== 1 && p.id !== 2);
      setProducts(cleanProducts);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('collectors_products', JSON.stringify(products));
  }, [products]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Imaginea este prea mare! Te rugăm să încarci o poză sub 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- MODIFICARE: FUNCȚIE FĂRĂ FORM SUBMIT CLASIC ---
  const handleAddProduct = () => {
    // 1. Validare Manuală (să fim siguri că nu e gol)
    if (!newProduct.title.trim() || !newProduct.price.trim() || !newProduct.description.trim()) {
      alert("Te rog completează Titlul, Prețul și Descrierea!");
      return;
    }

    const product: Product = {
      id: Date.now(),
      ...newProduct,
      image: newProduct.image || "https://images.unsplash.com/photo-1552318965-5638e4c66e71?auto=format&fit=crop&q=80&w=500",
      seller: user.name,
      sellerEmail: user.email,
      date: new Date().toISOString().split('T')[0]
    };

    setProducts([product, ...products]);
    setShowAddModal(false);
    setNewProduct({ title: '', price: '', category: 'Tricouri', image: '', description: '' });
    setActiveTab('my_items');
    setSelectedCategory("Toate");
    
    // Mesaj de confirmare
    alert("Anunțul a fost publicat cu succes!");
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Sigur vrei să ștergi acest produs?")) {
      const updatedList = products.filter(p => p.id !== id);
      setProducts(updatedList);
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

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-500">Niciun produs găsit.</h3>
          <p className="text-sm text-gray-400">{products.length === 0 ? "Nu există încă produse la vânzare. Fii primul care adaugă!" : "Încearcă să schimbi filtrele."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-800 shadow-sm">{product.category}</div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{product.title}</h3>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap">{product.price}</span>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">{product.seller.charAt(0)}</div>
                    <span className="font-medium truncate max-w-[100px]">{product.seller}</span>
                  </div>
                  {product.sellerEmail === user.email ? (
                    <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  ) : (
                    <button className="text-blue-600 font-bold text-sm hover:underline">Contact</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Vinde un articol</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            {/* AM ELIMINAT TAGUL <FORM> pentru a evita problemele de submit ascunse */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Titlu Produs</label>
                <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Tricou Națională 2024" value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preț</label>
                  <input type="text" className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 150 RON" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Categorie</label>
                  <select className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORIES.filter(c => c !== "Toate").map(cat => (<option key={cat}>{cat}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Imagine Produs</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition-colors relative">
                  {newProduct.image ? (
                    <div className="relative">
                      <img src={newProduct.image} alt="Preview" className="h-48 w-full object-contain rounded-lg mx-auto" />
                      <button type="button" onClick={() => setNewProduct({...newProduct, image: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center justify-center py-4">
                        <div className="bg-blue-50 p-3 rounded-full mb-2"><Upload className="w-6 h-6 text-blue-600" /></div>
                        <p className="text-sm font-medium text-gray-900">Apasă pentru a încărca o poză</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG (Max 2MB)</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descriere</label>
                <textarea className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" placeholder="Detalii despre starea produsului..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})}></textarea>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 text-sm text-blue-800">
                <User className="w-5 h-5" />
                <span>Vei posta ca: <strong>{user.name}</strong></span>
              </div>

              {/* MODIFICARE: onClick explicit și type="button" */}
              <button 
                type="button" 
                onClick={handleAddProduct}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30"
              >
                Publică Anunțul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}