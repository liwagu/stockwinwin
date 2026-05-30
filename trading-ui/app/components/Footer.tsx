import Link from "next/link";

const footerLinks = [
  { href: "#pricing", label: "Pricing" },
  { href: "mailto:stockwin.win@proton.me", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function Footer() {
  return (
    <footer className="sw-footer mt-20">
      <div className="sw-container flex flex-col gap-4 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="sw-logo-mark">S</span>
          <div>
            <p className="font-semibold text-foreground">StockWin</p>
            <p className="max-w-xl text-muted-foreground">
              Forecasts are informational research outputs, not investment advice.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {footerLinks.map(link => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}
