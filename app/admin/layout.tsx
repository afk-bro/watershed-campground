"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ToastProvider } from "@/components/ui/Toast";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);

            // Redirect to login if not authenticated (unless already on auth-related pages)
            const authPages = ['/admin/login', '/admin/forgot-password', '/admin/update-password'];
            if (!user && !authPages.includes(pathname)) {
                router.push('/admin/login');
            }
        };
        getUser();
    }, [router, pathname]);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/admin/login");
        router.refresh();
    }

    // Don't show navbar on auth pages
    const authPages = ['/admin/login', '/admin/forgot-password', '/admin/update-password'];
    const isAuthPage = authPages.includes(pathname);

    // Show loading state while checking auth
    if (loading) {
        return (
            <ToastProvider>
                <div className="min-h-screen bg-[var(--color-surface-elevated)] flex items-center justify-center">
                    <div className="text-accent-beige">Loading...</div>
                </div>
            </ToastProvider>
        );
    }

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[var(--color-surface-elevated)]">
                {!isAuthPage && (
                    <div className="bg-brand-forest border-b border-[var(--color-border-strong)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center gap-4">
                                    <a
                                        href="/"
                                        className="text-accent-beige/60 hover:text-accent-beige text-xs transition-colors flex items-center gap-1"
                                        title="View public site"
                                    >
                                        ← Site
                                    </a>
                                    <div className="h-6 w-px bg-accent-beige/20"></div>
                                    <h1 className="text-xl font-heading font-bold text-accent-gold">
                                        Admin Panel
                                    </h1>
                                    <span className="text-sm text-accent-beige/60">
                                        {user?.email}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <a
                                        href="/admin"
                                        className="text-accent-beige hover:text-accent-gold transition-colors text-sm"
                                    >
                                        Reservations
                                    </a>
                                    <a
                                        href="/admin/calendar"
                                        className="text-accent-beige hover:text-accent-gold transition-colors text-sm"
                                    >
                                        Calendar
                                    </a>
                                    <a
                                        href="/admin/campsites"
                                        className="text-accent-beige hover:text-accent-gold transition-colors text-sm"
                                    >
                                        Campsites
                                    </a>
                                    <a
                                        href="/admin/settings"
                                        className="text-accent-beige hover:text-accent-gold transition-colors text-sm"
                                    >
                                        Settings
                                    </a>
                                    <a
                                        href="/admin/help"
                                        className="text-accent-beige hover:text-accent-gold transition-colors text-sm flex items-center gap-1"
                                    >
                                        Help
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="bg-accent-gold text-brand-forest px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {children}
            </div>
        </ToastProvider>
    );
}
