import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// Definim ce primește componenta din App.tsx
interface NavbarProps {
  onNavigate: (section: any) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
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

        {/* Mobile Menu Trigger */}
        <Button variant="ghost" className="inline-flex md:hidden" size="icon">
           <Menu className="h-5 w-5" />
        </Button>

        {/* Right Side */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search collections..." className="pl-8 h-9 md:w-[300px] lg:w-[300px]" />
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
    </header>
  );
}