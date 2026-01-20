import { useState } from "react"; // 1. IMPORT NECESAR PENTRU STARE
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Menu, User, X } from "lucide-react"; // 2. AM ADĂUGAT ICONIȚA 'X'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface NavbarProps {
  onNavigate: (section: any) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  // 3. STAREA PENTRU MENIUL DE MOBIL
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Funcție ajutătoare ca să navigheze și să închidă meniul
  const handleMobileNavigate = (section: string) => {
    onNavigate(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        
        {/* === LOGO & DESKTOP MENU === */}
        <div className="mr-4 hidden md:flex">
          <button 
            onClick={() => onNavigate('home')} 
            className="mr-6 flex items-center space-x-2 outline-none"
          >
            <span className="hidden font-bold sm:inline-block">
              CollectorsHub
            </span>
          </button>
          
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <button 
              onClick={() => onNavigate('heroes')}
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Heroes
            </button>
            <button 
              onClick={() => onNavigate('collectors')} 
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Hub
            </button>
            <button 
              onClick={() => onNavigate('dashboard')} 
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </button>
          </nav>
        </div>

        {/* === MOBILE MENU TRIGGER (BUTONUL CU 3 LINII) === */}
        <Button 
          variant="ghost" 
          className="inline-flex md:hidden mr-2" 
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} // Deschide/Închide
        >
           {/* Schimbă iconița: X dacă e deschis, Menu dacă e închis */}
           {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* === RIGHT SIDE (SEARCH + USER) === */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8 h-9 md:w-[300px] lg:w-[300px]" />
            </div>
          </div>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate('dashboard')}>
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* === MOBILE MENU CONTENT (APARE DOAR CÂND E DESCHIS) === */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 animate-in slide-in-from-top-5">
          <nav className="grid gap-4 text-sm font-medium">
            <button 
              onClick={() => handleMobileNavigate('home')}
              className="flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-left"
            >
              Home / CollectorsHub
            </button>
            <button 
              onClick={() => handleMobileNavigate('heroes')}
              className="flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-left"
            >
              Heroes
            </button>
            <button 
              onClick={() => handleMobileNavigate('collectors')}
              className="flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-left"
            >
              Hub
            </button>
            <button 
              onClick={() => handleMobileNavigate('dashboard')}
              className="flex items-center p-2 rounded-md hover:bg-accent hover:text-accent-foreground text-left"
            >
              Dashboard
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}