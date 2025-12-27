"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Container from "@/components/Container";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleLogin(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            router.push("/admin");
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to log in");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[var(--color-surface-elevated)] flex items-center justify-center py-12">
            <Container>
                <div className="max-w-md mx-auto admin-card p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-heading font-bold text-accent-gold mb-2">
                            Admin Login
                        </h1>
                        <p className="text-[var(--color-text-muted)]">
                            Sign in to manage reservations
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-[var(--color-text-primary)] mb-3"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                data-testid="admin-login-email"
                                className="w-full px-4 py-3.5 md:py-3 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] text-base focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20"
                                placeholder="admin@example.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-[var(--color-text-primary)] mb-3"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    data-testid="admin-login-password"
                                    className="w-full px-4 py-3.5 md:py-3 pr-14 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] text-base focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors touch-manipulation"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            data-testid="admin-login-submit"
                            className="w-full bg-brand-forest text-accent-beige py-4 md:py-3 px-6 rounded-lg font-medium text-base hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[48px]"
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>

                        <div className="text-center">
                            <a
                                href="/admin/forgot-password"
                                className="inline-block py-2 px-4 text-sm text-[var(--color-text-muted)] hover:text-accent-gold transition-colors underline touch-manipulation"
                            >
                                Forgot Password?
                            </a>
                        </div>
                    </form>
                </div>
            </Container>
        </div>
    );
}
