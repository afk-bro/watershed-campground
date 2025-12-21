"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Container from "@/components/Container";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    async function handlePasswordReset(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
            });

            if (error) throw error;

            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to send reset email");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[var(--color-surface-elevated)] flex items-center justify-center py-12">
                <Container>
                    <div className="max-w-md mx-auto admin-card p-8">
                        <div className="text-center">
                            <div className="mb-4 text-accent-gold text-5xl">✓</div>
                            <h1 className="text-2xl font-heading font-bold text-accent-gold mb-4">
                                Check Your Email
                            </h1>
                            <p className="text-[var(--color-text-muted)] mb-6">
                                We&apos;ve sent password reset instructions to{" "}
                                <span className="text-[var(--color-text-primary)] font-medium">
                                    {email}
                                </span>
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)] mb-6">
                                Click the link in the email to reset your password. The link will
                                expire in 1 hour.
                            </p>
                            <a
                                href="/admin/login"
                                className="inline-block bg-brand-forest text-accent-beige py-3 px-6 rounded-lg font-medium hover:bg-opacity-90 transition-all"
                            >
                                Back to Login
                            </a>
                        </div>
                    </div>
                </Container>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-surface-elevated)] flex items-center justify-center py-12">
            <Container>
                <div className="max-w-md mx-auto admin-card p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-heading font-bold text-accent-gold mb-2">
                            Reset Password
                        </h1>
                        <p className="text-[var(--color-text-muted)]">
                            Enter your email address and we&apos;ll send you instructions to reset your
                            password
                        </p>
                    </div>

                    <form onSubmit={handlePasswordReset} className="space-y-6">
                        {error && <div className="error-message">{error}</div>}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
                            >
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                data-testid="forgot-password-email"
                                className="w-full px-4 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20"
                                placeholder="admin@example.com"
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            data-testid="forgot-password-submit"
                            className="w-full bg-brand-forest text-accent-beige py-3 px-6 rounded-lg font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Sending..." : "Send Reset Instructions"}
                        </button>

                        <div className="text-center">
                            <a
                                href="/admin/login"
                                className="text-sm text-[var(--color-text-muted)] hover:text-accent-gold transition-colors underline"
                            >
                                Back to Login
                            </a>
                        </div>
                    </form>
                </div>
            </Container>
        </div>
    );
}
