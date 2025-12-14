"use client";

import { useRouter } from "next/navigation";
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
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/admin/login");
        router.refresh();
    }

    // Don't show logout button on login page
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/admin/login';

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[var(--color-surface-elevated)]">
                {!isLoginPage && user && (
                    <div className="bg-brand-forest border-b border-[var(--color-border-strong)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center gap-4">
                                    <h1 className="text-xl font-heading font-bold text-accent-gold">
                                        Admin Panel
                                    </h1>
                                    <span className="text-sm text-accent-beige">
                                        {user.email}
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
