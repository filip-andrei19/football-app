import { Calendar, Home, Inbox, Search, Settings, User2, ChevronUp } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "./ui/sidebar"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu"

// Menu items.
const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Dashboard", url: "/dashboard", icon: Inbox },
  { title: "Collections", url: "#", icon: Calendar },
  { title: "Marketplace", url: "#", icon: Search },
  { title: "Settings", url: "#", icon: Settings },
]

export default function AppSidebar() {
  return (
    <>
      {/* === DESKTOP SIDEBAR (Ascuns pe ecrane mici) === */}
      <div className="hidden md:block">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Application</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton>
                      <User2 /> Username
                      <ChevronUp className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    className="w-[--radix-popper-anchor-width]"
                  >
                    <DropdownMenuItem>Account</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuItem>Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* === MOBILE BOTTOM TAB BAR (Apare doar pe telefon) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex justify-around items-center h-16 pb-safe shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
        {items.map((item) => (
          <a 
            key={item.title} 
            href={item.url} 
            className="flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-primary transition-colors"
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{item.title}</span>
          </a>
        ))}
      </nav>
    </>
  )
}