export default function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-10 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold">About</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Our Story</a></li>
              <li><a href="#" className="hover:text-foreground">Team</a></li>
              <li><a href="#" className="hover:text-foreground">Careers</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Community</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Events</a></li>
              <li><a href="#" className="hover:text-foreground">Forum</a></li>
              <li><a href="#" className="hover:text-foreground">Discord</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Newsletter</h3>
            <p className="mt-4 text-sm text-muted-foreground">
              Subscribe to get the latest updates on rare collectibles.
            </p>
          </div>
        </div>
        <div className="mt-10 border-t pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CollectorsHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}