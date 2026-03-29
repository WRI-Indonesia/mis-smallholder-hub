import Link from "next/link";
import { Leaf, Facebook, Twitter, Instagram, Youtube, MapPin, Mail, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-border/10 text-gray-300 pt-16 pb-8">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Brand Col */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex shrink-0 items-center justify-center text-[#166534] shadow-md">
                <Leaf className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-white leading-tight tracking-tight">Smallholder HUB</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Memberdayakan petani sawit swadaya untuk produksi kelapa sawit berkelanjutan dan kehidupan yang lebih baik.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Facebook className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Twitter className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Instagram className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                <Youtube className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Links Col 1 */}
          <div>
            <h3 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Tautan Cepat</h3>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-primary transition-colors">Tentang Kami</Link></li>
              <li><Link href="/community" className="hover:text-primary transition-colors">Komunitas</Link></li>
              <li><Link href="/news" className="hover:text-primary transition-colors">Media</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Kontak</Link></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div>
            <h3 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Sumber Daya</h3>
            <ul className="flex flex-col gap-4 text-sm text-gray-400">
              <li><Link href="/knowledge-management" className="hover:text-primary transition-colors">Praktik Terbaik</Link></li>
              <li><Link href="/knowledge-management" className="hover:text-primary transition-colors">Materi Pelatihan</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Laporan</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact Col */}
          <div>
            <h3 className="font-bold text-white mb-6 uppercase tracking-wider text-sm">Hubungi Kami</h3>
            <ul className="flex flex-col gap-5 text-sm text-gray-400">
              <li className="flex items-start gap-3 mt-1">
                <MapPin className="w-5 h-5 text-primary shrink-0 -mt-0.5" />
                <span className="leading-relaxed">Riau Province, Indonesia</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span className="hover:text-white transition-colors cursor-pointer">info-mis@wri.org</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+62 8xxx xxxx xxxx</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} WRI Indonesia - Sawit Swadaya Program. Semua Hak Dilindungi.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
            <Link href="#" className="hover:text-white transition-colors">Ketentuan Layanan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
