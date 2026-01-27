import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Search, Tag, Trash2, User, Filter, X, Image as ImageIcon } from 'lucide-react';

// Interfața pentru un produs
interface Product {
  id: number;
  title: string;
  price: string;
  category: string;
  image: string;
  description: string;
  seller: string;      // Numele vizibil
  sellerEmail: string; // Identificator unic pentru permisiuni
  date: string;
}

interface CollectorsHubProps {
  user: {
    name: string;
    email: string;
  };
}

// Date inițiale (demo)
const DEMO_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Tricou Hagi 1994 Original",
    price: "450 EUR",
    category: "Tricouri",
    image: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&q=80&w=500",
    description: "Tricou purtat la CM 1994, stare impecabilă, semnat.",
    seller: "Magazin Oficial",
    sellerEmail: "admin@romania.ro",
    date: "2024-01-15"
  },
  {
    id: 2,
    title: "Minge Semnată Generația de Aur",
    price: "200 EUR",
    category: "Suveniruri",
    image: "https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?auto=format&fit=crop&q=80&w=500",
    description: "Minge de colecție cu semnăturile tuturor jucătorilor.",
    seller: "Ion Popescu",
    sellerEmail: "ion@test.com",
    date: "2024-01-20"
  }
];

export function CollectorsHubSection({ user }: CollectorsHubProps) {
  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'market' | 'my_items'>('market');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Formular nou produs
  const [newProduct, setNewProduct] = useState({
    title: '',
    price: '',
    category: 'Tricouri',
    image: '',
    description: ''
  });

  // --- 1. ÎNCĂRCARE DATE (din LocalStorage sau Demo) ---
  useEffect(() => {
    const saved = localStorage.getItem('collectors_products');
    if (saved) {
      setProducts(JSON.parse(saved));
    } else {
      setProducts(DEMO_PRODUCTS);
    }
  }, []);

  // --- 2. SALVARE DATE (la fiecare modificare) ---
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('collectors_products', JSON.stringify(products));
    }
  }, [products]);

  // --- LOGICA ADĂUGARE ---
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    
    const product: Product = {
      id: Date.now(),
      ...newProduct,
      image: newProduct.image || "https://images.unsplash.com/photo-1552318965-5638e4c66e71?auto=format&fit=crop&q=80&w=500", // Placeholder
      seller: user.name,       // Luăm automat numele userului logat
      sellerEmail: user.email, // Luăm emailul pentru verificare ulterioară
      date: new Date().toISOString().split('T')[0]
    };

    setProducts([product, ...products]);
    setShowAddModal(false);
    setNewProduct({ title: '', price: '', category: 'Tricouri', image: '', description: '' });
    
    // Comutăm automat pe tab-ul "Produsele Mele" să vadă ce a adăugat
    setActiveTab('my_items');
  };

  // --- LOGICA ȘTERGERE (Doar proprietarul poate) ---
  const handleDelete = (id: number) => {
    if (window.confirm("Sigur vrei să ștergi acest produs?")) {
      const updatedList = products.filter(p => p.id !== id);
      setProducts(updatedList);
    }
  };

  // --- FILTRARE PENTRU AFIȘARE ---
  const filteredProducts = products.filter(p => {
    // 1. Filtru text (căutare)
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filtru Tab (Toate vs Ale Mele)
    if (activeTab === 'my_items') {
      return matchesSearch && p.sellerEmail === user.email;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER + TABURI */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" /> Collectors Hub
          </h2>
          <p className="text-gray-500">
            Piața oficială pentru colecționarii echipei naționale.
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('market')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'market' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Toate Produsele
          </button>
          <button
            onClick={() => setActiveTab('my_items')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'my_items' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4" /> Produsele Mele
          </button>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" /> Vinde Produs
        </button>
      </div>

      {/* CĂUTARE */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Caută tricouri, fulare, bilete..." 
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* LISTA DE PRODUSE */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-500">Nu am găsit produse.</h3>
          <p className="text-sm text-gray-400">Încearcă să schimbi filtrele sau adaugă primul tău produs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
              {/* Imagine */}
              <div className="relative h-48 overflow-hidden bg-gray-100">
                <img 
                  src={product.image} 
                  alt={product.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-blue-800 shadow-sm">
                  {product.category}
                </div>
              </div>

              {/* Conținut */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">
                    {product.title}
                  </h3>
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg text-sm font-bold whitespace-nowrap">
                    {product.price}
                  </span>
                </div>
                
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                  {product.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {product.seller.charAt(0)}
                    </div>
                    <span className="font-medium truncate max-w-[100px]">{product.seller}</span>
                  </div>

                  {/* Buton Ștergere - Apare DOAR dacă ești proprietarul */}
                  {product.sellerEmail === user.email ? (
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Șterge produsul tău"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button className="text-blue-600 font-bold text-sm hover:underline">
                      Contact
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL ADĂUGARE PRODUS */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Vinde un articol</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Titlu Produs</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Tricou Națională 2024"
                  value={newProduct.title}
                  onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preț</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 150 RON"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Categorie</label>
                  <select 
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option>Tricouri</option>
                    <option>Fulatre</option>
                    <option>Bilete & Programe</option>
                    <option>Suveniruri</option>
                    <option>Echipament</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Link Imagine (URL)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
                  <input 
                    type="url" 
                    className="w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://..."
                    value={newProduct.image}
                    onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Lasă gol pentru imaginea default.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descriere</label>
                <textarea 
                  required
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                  placeholder="Detalii despre starea produsului..."
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                ></textarea>
              </div>

              {/* AICI ESTE SCHIMBAREA CERUTĂ: VÂNZĂTORUL ESTE FIXAT */}
              <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3 text-sm text-blue-800">
                <User className="w-5 h-5" />
                <span>
                  Vei posta ca: <strong>{user.name}</strong>
                </span>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30">
                Publică Anunțul
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}