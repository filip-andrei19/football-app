import React, { useState } from 'react';
import { Button } from './ui/button';
import { X, Loader2 } from 'lucide-react';

export function AuthPage({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Pentru simplitate, la înregistrare folosim 'Name' generic, poți adăuga input separat
  const [name, setName] = useState(''); 
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // URL-ul se schimbă în funcție de acțiune
    const endpoint = isSignUp 
      ? 'https://football-backend-m2a4.onrender.com/api/users/register' 
      : 'https://football-backend-m2a4.onrender.com/api/users/login';

    // Pregătim datele pentru trimis
    const payload = isSignUp 
      ? { 
          name: name || "User Nou", // Backend-ul cere nume
          email, 
          password, 
          passwordConfirm: password // Backend-ul cere confirmare, o trimitem pe aceeași
        }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ceva nu a mers bine.');
      }

      // SUCCES!
      if (data.token) {
        // Salvăm token-ul în browser
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        alert(isSignUp ? 'Cont creat cu succes!' : 'Logare reușită!');
        onClose(); // Închidem fereastra
        window.location.reload(); // Reîncărcăm pagina ca să se actualizeze meniul (opțional)
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-card border rounded-lg shadow-lg">
        <button onClick={onClose} className="absolute right-4 top-4 hover:bg-muted p-1 rounded">
          <X className="h-4 w-4" />
        </button>
        
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isSignUp ? 'Creează Cont' : 'Autentificare'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium mb-1">Nume</label>
              <input 
                type="text" 
                className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Numele tău"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplu@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Parolă</label>
            <input 
              type="password" 
              required
              className="w-full p-2 border rounded-md bg-background focus:ring-2 focus:ring-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? 'Înregistrează-te' : 'Intră în Cont'}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">
            {isSignUp ? 'Ai deja cont?' : 'Nu ai cont?'}
          </span>
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 font-bold text-primary hover:underline"
          >
            {isSignUp ? 'Loghează-te' : 'Creează unul'}
          </button>
        </div>
      </div>
    </div>
  );
}