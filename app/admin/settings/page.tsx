"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Container from "@/components/Container";

export default function AdminSettingsPage() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const supabase = createClient();

    async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to update password' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="py-12">
            <Container>
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <h1 className="text-3xl font-heading font-bold text-brand-forest mb-6">
                            Admin Settings
                        </h1>

                        <form onSubmit={handlePasswordChange} className="space-y-6">
                            <div>
                                <h2 className="text-xl font-heading font-semibold text-brand-forest mb-4">
                                    Change Password
                                </h2>

                                {message && (
                                    <div className={`mb-4 p-4 rounded-lg ${
                                        message.type === 'success'
                                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                            : 'bg-red-50 border border-red-200 text-red-700'
                                    }`}>
                                        {message.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            id="newPassword"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent"
                                            placeholder="Enter new password"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-2">
                                            Confirm Password
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={8}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-accent-gold focus:border-transparent"
                                            placeholder="Confirm new password"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-brand-forest text-accent-beige py-3 px-6 rounded-lg font-medium hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </Container>
        </div>
    );
}
