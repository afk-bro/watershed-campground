"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Container from "@/components/Container";

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Validate password length
        if (password.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            // Password updated successfully
            // Redirect to admin area
            router.push("/admin");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "Failed to update password");
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
                            Set New Password
                        </h1>
                        <p className="text-[var(--color-text-muted)]">
                            Enter a new password for your account
                        </p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        {error && <div className="error-message">{error}</div>}

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
                            >
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    data-testid="update-password-password"
                                    className="w-full px-4 py-2 pr-12 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20"
                                    placeholder="Enter new password (min. 6 characters)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
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

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
                            >
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    data-testid="update-password-confirm"
                                    className="w-full px-4 py-2 pr-12 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-lg text-[var(--color-text-primary)] focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20"
                                    placeholder="Re-enter new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirm password"
                                            : "Show confirm password"
                                    }
                                >
                                    {showConfirmPassword ? (
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
                            data-testid="update-password-submit"
                            className="w-full bg-brand-forest text-accent-beige py-3 px-6 rounded-lg font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Updating Password..." : "Update Password"}
                        </button>
                    </form>
                </div>
            </Container>
        </div>
    );
}
