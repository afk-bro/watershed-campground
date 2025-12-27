"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Container from "@/components/Container";
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock, Info } from "lucide-react";

export default function AdminSettingsPage() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const supabase = createClient();

    const isMatch = newPassword && confirmPassword ? newPassword === confirmPassword : true;
    const isValid = newPassword.length >= 8 && confirmPassword.length >= 8 && isMatch;
    const isDirty = newPassword.length > 0 || confirmPassword.length > 0;

    async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!isValid) return;
        
        setMessage(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="py-12">
            <Container>
                <div className="max-w-2xl mx-auto">
                    <div className="admin-card p-8 shadow-xl border-[var(--color-border-strong)]/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-accent-gold/10 rounded-lg">
                                <Lock className="text-accent-gold" size={24} />
                            </div>
                            <h1 className="text-3xl font-heading font-bold text-accent-gold">
                                Admin Settings
                            </h1>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-8">
                            <div>
                                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-[0.2em] mb-6 border-b border-[var(--color-border-subtle)] pb-2">
                                    Change Password
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-bold text-[var(--color-text-primary)] mb-3">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="newPassword"
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className="w-full px-4 py-3.5 md:py-3 pr-14 bg-[var(--color-surface-card)] border border-[var(--color-border-strong)] rounded-xl text-[var(--color-text-primary)] text-base focus:border-accent-gold focus:ring-4 focus:ring-accent-gold/10 transition-all placeholder:text-[var(--color-text-muted)]/60"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-[var(--color-text-muted)] hover:text-accent-gold transition-colors touch-manipulation"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 px-1">
                                            <Info size={12} />
                                            Minimum 8 characters
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-bold text-[var(--color-text-primary)] mb-3">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                className={`w-full px-4 py-3.5 md:py-3 pr-14 bg-[var(--color-surface-card)] border rounded-xl text-[var(--color-text-primary)] text-base focus:ring-4 transition-all placeholder:text-[var(--color-text-muted)]/60 ${
                                                    !isMatch
                                                        ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/10'
                                                        : 'border-[var(--color-border-strong)] focus:border-accent-gold focus:ring-accent-gold/10'
                                                }`}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-[var(--color-text-muted)] hover:text-accent-gold transition-colors touch-manipulation"
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {!isMatch && (
                                            <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5 px-1 animate-in fade-in slide-in-from-top-1">
                                                <AlertCircle size={12} />
                                                Passwords do not match
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading || !isValid}
                                            className="w-full bg-brand-forest text-accent-beige py-4 px-6 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-opacity-95 transform active:scale-[0.98] transition-all shadow-lg shadow-black/10 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group relative overflow-hidden touch-manipulation min-h-[48px]"
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                {loading ? 'Updating...' : 'Update Password'}
                                            </span>
                                        </button>

                                        {message && (
                                            <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                                                message.type === 'success'
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                                    : 'bg-red-500/10 border-red-500/20 text-red-600'
                                            }`}>
                                                {message.type === 'success' ? (
                                                    <CheckCircle className="mt-0.5 shrink-0" size={18} />
                                                ) : (
                                                    <AlertCircle className="mt-0.5 shrink-0" size={18} />
                                                )}
                                                <p className="text-sm font-medium">{message.text}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </Container>
        </div>
    );
}
