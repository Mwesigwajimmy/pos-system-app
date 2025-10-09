export default function LandingFooter() {
    return (
        <footer className="border-t py-8">
            <div className="container mx-auto text-center text-sm text-muted-foreground">
                <p>&copy; {new Date().getFullYear()} UG-BizSuite. Designed by Mwesigwa Jimmy. All rights reserved.</p>
                <div className="mt-2 space-x-4">
                    <a href="#" className="hover:underline">Privacy Policy</a>
                    <a href="#" className="hover:underline">Terms of Service</a>
                </div>
            </div>
        </footer>
    );
}