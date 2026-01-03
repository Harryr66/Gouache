import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background py-6 pb-48 md:pb-24">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/support" className="transition-colors hover:text-foreground">Support</Link>
            <Link href="#" className="transition-colors hover:text-foreground">Terms of Service</Link>
            <Link href="#" className="transition-colors hover:text-foreground">Privacy Policy</Link>
            <Link href="/advertise" className="transition-colors hover:text-foreground">Advertise with Gouache</Link>
            <Link href="/partners/login" className="transition-colors hover:text-foreground">Partners</Link>
            <Link href="/admin" className="font-medium transition-colors hover:text-foreground">
                Admin
            </Link>
            <ThemeToggle />
        </nav>
        <p className="text-sm leading-loose text-muted-foreground">
          © {new Date().getFullYear()} Gouache. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
