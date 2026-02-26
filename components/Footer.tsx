import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-[--border] mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="DealBridge" width={24} height={24} />
            <span className="text-sm font-semibold text-[--text-secondary]">DealBridge</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-sm text-[--text-muted]">
            <Link href="/deals" className="py-1 hover:text-[--text-primary] transition">
              Deals
            </Link>
            <Link href="/auth/login" className="py-1 hover:text-[--text-primary] transition">
              Sign in
            </Link>
            <Link href="/auth/signup" className="py-1 hover:text-[--text-primary] transition">
              Get Started
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs text-[--text-muted]">
            <Link href="/terms" className="py-1 hover:text-[--text-primary] transition">
              Terms
            </Link>
            <Link href="/privacy" className="py-1 hover:text-[--text-primary] transition">
              Privacy
            </Link>
            <Link href="/disclaimer" className="py-1 hover:text-[--text-primary] transition">
              Disclaimer
            </Link>
            <span>&copy; {new Date().getFullYear()} DealBridge</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
