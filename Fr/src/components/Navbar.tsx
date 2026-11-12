import { useState } from "react"; 
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Menu, User, X } from "lucide-react"; 
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
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileNavigate = (section: string) => {
    onNavigate(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        
        {/* === LEFT SIDE (Mobile Menu Trigger & Logo) === */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            className="md:hidden mr-2 -ml-2" 
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          >
             {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <button 
            onClick={() => onNavigate('home')} 
            className="flex items-center space-x-2 outline-none md:mr-6"
          >
            <span className="font-bold sm:inline-block">
              CollectorsHub
            </span>
          </button>
        </div>
        
        {/* === CENTER (Desktop Links) === */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
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

        {/* === RIGHT SIDE (Search pe Desktop + User Menu) === */}
        <div className="flex items-center space-x-2">
          {/* Căutarea e vizibilă sus doar pe tablete și desktop */}
          <div className="hidden sm:block relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9 w-[200px] lg:w-[300px]" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
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

      {/* === MOBILE MENU CONTENT (Dropdown Peste Conținut) === */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full border-b bg-background p-4 animate-in slide-in-from-top-2 shadow-lg">
          {/* Bara de search mutată în interiorul meniului pe mobil pentru a nu sparge design-ul */}
          <div className="relative mb-4 sm:hidden">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search for items, heroes..." className="pl-9 h-10 w-full rounded-xl bg-accent/50" />
          </div>

          <nav className="grid gap-2 text-sm font-medium">
            <button 
              onClick={() => handleMobileNavigate('home')}
              className="flex items-center p-3 rounded-lg hover:bg-accent hover:text-accent-foreground text-left font-bold"
            >
              Home / CollectorsHub
            </button>
            <button 
              onClick={() => handleMobileNavigate('heroes')}
              className="flex items-center p-3 rounded-lg hover:bg-accent hover:text-accent-foreground text-left font-bold"
            >
              Heroes
            </button>
            <button 
              onClick={() => handleMobileNavigate('collectors')}
              className="flex items-center p-3 rounded-lg hover:bg-accent hover:text-accent-foreground text-left font-bold"
            >
              Hub
            </button>
            <button 
              onClick={() => handleMobileNavigate('dashboard')}
              className="flex items-center p-3 rounded-lg hover:bg-accent hover:text-accent-foreground text-left font-bold"
            >
              Dashboard
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}