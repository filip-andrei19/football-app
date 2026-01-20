import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ShoppingBag, Search, Filter, Clock, Tag, MessageCircle, Heart, TrendingUp, Trash2, Plus, X, Phone, Image as ImageIcon, UploadCloud } from 'lucide-react';

// Interfața adaptată pentru MongoDB (_id în loc de id)
interface Listing {
  _id: string; // MongoDB folosește _id
  title: string;
  category: string;
  price: string;
  condition: string;
  seller: string;
  location: string;
  phone: string;
  posted: string;
  image: string;
  description: string;
}

export function CollectorsHubSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  
  const CURRENT_USER = "Eu"; 

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Stare pentru loading la salvare

  const [newItem, setNewItem] = useState({
    title: '',
    category: 'Jerseys',
    price: '',
    condition: 'New',
    location: '',
    phone: '',
    description: '',
    image: ''
  });

  // Pornim cu lista goală, o umplem de pe server
  const [listings, setListings] = useState<Listing[]>([]);

  // --- 1. ÎNCĂRCARE PRODUSE DE PE SERVER ---
  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/listings');
        const data = await response.json();
        setListings(data);
    } catch (error) {
        console.error("Nu am putut încărca produsele:", error);
    }
  };

  // --- 2. UPLOAD IMAGINE ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificăm mărimea (max 2MB recomandat pentru Base64 simplu)
      if (file.size > 2 * 1024 * 1024) {
          alert("Imaginea este prea mare! Te rog alege una sub 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- 3. ȘTERGERE DE PE SERVER ---
  const handleDelete = async (id: string) => {
    if (window.confirm('Sigur vrei să ștergi acest anunț definitiv?')) {
        try {
            await fetch(`http://localhost:3000/api/listings/${id}`, {
                method: 'DELETE'
            });
            // Actualizăm lista locală după ștergere
            setListings(listings.filter(item => item._id !== id));
        } catch (error) {
            alert("Eroare la ștergere.");
        }
    }
  };

  // --- 4. SALVARE PE SERVER ---
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const itemToSend = {
        ...newItem,
        seller: CURRENT_USER,
        posted: new Date(), // Data curentă
        image: newItem.image || '' 
    };

    try {
        const response = await fetch('http://localhost:3000/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemToSend)
        });

        if (response.ok) {
            const savedItem = await response.json();
            setListings([savedItem, ...listings]); // Adăugăm în listă imediat
            setIsFormOpen(false); 
            setNewItem({ title: '', category: 'Jerseys', price: '', condition: 'New', location: '', phone: '', description: '', image: '' });
        } else {
            alert("Eroare la salvare. Poate imaginea e prea mare?");
        }
    } catch (error) {
        console.error("Eroare:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- RESTUL (Filtrare, UI) ---
  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (listing.description && listing.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]);
  };

  // Formulare pentru data afișată
  const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('ro-RO') + ' ' + date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-green-600/20">
            <ShoppingBag className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Collectors' Hub</h1>
            <p className="text-muted-foreground">Buy, sell, and trade Romanian football memorabilia</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="recent">Recent Sales</TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Jerseys">Jerseys</SelectItem>
                <SelectItem value="Scarves">Scarves</SelectItem>
                <SelectItem value="Tickets">Tickets</SelectItem>
                <SelectItem value="Memorabilia">Memorabilia</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Vinde Produs
            </Button>
          </div>

          {filteredListings.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">Niciun produs găsit</h3>
                  <p className="text-gray-500">Fii primul care adaugă ceva la vânzare!</p>
              </div>
          )}

          {/* Listings Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing._id} className="overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                   {listing.image ? (
                        <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                   ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <ImageIcon className="h-10 w-10" />
                        </div>
                   )}

                  <button onClick={() => toggleFavorite(listing._id)} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white transition-colors z-10">
                    <Heart className={`h-4 w-4 ${favorites.includes(listing._id) ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                  </button>
                  
                  {listing.seller === CURRENT_USER && (
                      <button onClick={() => handleDelete(listing._id)} className="absolute top-3 left-3 p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-colors z-10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                  )}

                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="bg-white/90">{listing.category}</Badge>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{listing.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{listing.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{listing.price}</div>
                      <div className="text-xs text-muted-foreground">Condition: {listing.condition}</div>
                    </div>
                  </div>
                  
                  {listing.phone && (
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 p-2 rounded">
                          <Phone className="h-3 w-3" /> {listing.phone}
                      </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {/* Formatam data ca sa arate frumos */}
                      {formatDate(listing.posted)}
                    </span>
                    <span>{listing.location}</span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Seller: <span className="text-foreground font-medium">{listing.seller}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm">Contact Seller</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="community" className="space-y-6">
            <div className="p-10 text-center text-gray-500">Community Area</div>
        </TabsContent>
        <TabsContent value="recent" className="space-y-6">
            <div className="p-10 text-center text-gray-500">Recent Sales Area</div>
        </TabsContent>
      </Tabs>

      {/* --- MODAL ADAUGARE PRODUS --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 h-[90vh] flex flex-col">
                <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-bold">Vinde un Produs</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 flex-1">
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Titlu Anunț</label>
                            <Input required placeholder="Ex: Tricou Dinamo 2000" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Preț</label>
                                <Input required placeholder="Ex: €50" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Categorie</label>
                                <select 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={newItem.category}
                                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                                >
                                    <option value="Jerseys">Jerseys</option>
                                    <option value="Scarves">Scarves</option>
                                    <option value="Tickets">Tickets</option>
                                    <option value="Memorabilia">Memorabilia</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Locație</label>
                                <Input required placeholder="Ex: București" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefon</label>
                                <Input placeholder="07xx xxx xxx" value={newItem.phone} onChange={e => setNewItem({...newItem, phone: e.target.value})} />
                            </div>
                        </div>

                        {/* --- UPLOAD POZA --- */}
                        <div>
                            <label className="block text-sm font-medium mb-1">Fotografie Produs</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleImageUpload} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {newItem.image ? (
                                    <div className="relative h-40 w-full">
                                        <img src={newItem.image} alt="Preview" className="h-full w-full object-contain rounded-md" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity">
                                            Schimbă Imaginea
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-500">
                                        <UploadCloud className="h-10 w-10 mb-2 text-blue-500" />
                                        <span className="text-sm font-medium">Click pentru a încărca o poză</span>
                                        <span className="text-xs text-gray-400 mt-1">PNG, JPG (max 2MB)</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Descriere</label>
                            <textarea 
                                required 
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Detalii despre produs..."
                                value={newItem.description}
                                onChange={e => setNewItem({...newItem, description: e.target.value})}
                            />
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Anulează</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                                {isSubmitting ? 'Se postează...' : 'Postează Anunț'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}