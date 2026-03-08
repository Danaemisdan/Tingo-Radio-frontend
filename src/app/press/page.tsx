import Link from 'next/link';
import Testimonials from '@/components/ui/testimonials';
import { ArrowLeft } from 'lucide-react';

export default function PressPage() {
    return (
        <main className="min-h-screen bg-black text-white relative">
            <nav className="p-6 absolute top-0 left-0 z-50">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-zinc-400 hover:text-[#FF6B35] transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Back to Home</span>
                </Link>
            </nav>
            <div className="pt-24 pb-24">
                <Testimonials />
            </div>
        </main>
    );
}
