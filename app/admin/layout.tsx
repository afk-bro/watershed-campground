"use client";

import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ToastProvider } from "@/components/ui/Toast";
import { ViewportModeProvider } from "@/components/providers/ViewportModeProvider";
import { AdminNav } from "@/components/admin/AdminNav";
import { isAuthPage as checkIsAuthPage, ADMIN_ROUTES } from "@/lib/admin/constants";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const isAuthPage = checkIsAuthPage(pathname);

    useEffect(() => {
        const supabase = createClient();
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);

            // Redirect to login if not authenticated (unless already on auth-related pages)
            if (!user && !isAuthPage) {
                router.push(ADMIN_ROUTES.LOGIN);
            }
        };
        getUser();
    }, [router, pathname, isAuthPage]);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push(ADMIN_ROUTES.LOGIN);
        router.refresh();
    }

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
        <ViewportModeProvider>
            <ToastProvider>
                <div className="min-h-screen bg-[var(--color-surface-elevated)]">
                    {!isAuthPage && (
                        <AdminNav
                            userEmail={user?.email}
                            onLogout={handleLogout}
                        />
                    )}
                    {children}
                </div>
            </ToastProvider>
        </ViewportModeProvider>
    );
}
