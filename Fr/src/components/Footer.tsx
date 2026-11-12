export default function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      {/* Am adăugat pb-24 pe mobil pentru a nu fi acoperit de Bottom Tab Bar-ul din Sidebar */}
      <div className="container py-10 pb-24 md:py-16 md:pb-16">
        
        {/* Pe mobil 1 coloană centrată, pe tabletă 2 coloane, pe desktop 4 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-semibold">About</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Our Story</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Team</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Community</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Events</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Forum</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Discord</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Newsletter</h3>
            <p className="mt-4 text-sm text-muted-foreground">
              Subscribe to get the latest updates on rare collectibles.
            </p>
          </div>
        </div>
        
        <div className="mt-10 border-t pt-8 text-center text-sm text-muted-foreground flex flex-col sm:block gap-2">
          © {new Date().getFullYear()} CollectorsHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}