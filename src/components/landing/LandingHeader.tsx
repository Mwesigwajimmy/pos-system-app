import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingHeader() {
    return (
        <header className="py-4 border-b">
            <div className="container mx-auto flex justify-between items-center px-4">
                <Link href="/" className="text-2xl font-bold text-primary">UG-BizSuite</Link>
                <nav className="flex items-center gap-4">
                    <Link href="#pricing" className="text-sm font-medium hover:underline">Pricing</Link>
                    <Button asChild variant="ghost"><Link href="/login">Log In</Link></Button>
                    <Button asChild><Link href="/signup">Get Started</Link></Button>
                </nav>
            </div>
        </header>
    );
}