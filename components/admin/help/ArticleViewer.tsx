"use client";

import { HelpArticle } from "@/lib/help-content";
import { ChevronLeft } from "lucide-react";

interface ArticleViewerProps {
    article: HelpArticle;
    onBack: () => void;
}

export default function ArticleViewer({ article, onBack }: ArticleViewerProps) {
    return (
        <div className="max-w-3xl mx-auto animate-in slide-in-from-right-4 duration-300">
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)] mb-6 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Help
            </button>

            <article className="prose prose-invert max-w-none">
                <h1 className="text-3xl font-heading font-bold text-[var(--color-accent-gold)] mb-4">
                    {article.title}
                </h1>
                
                <p className="text-xl text-[var(--color-text-primary)] mb-8 leading-relaxed">
                    {article.summary}
                </p>

                <div className="grid gap-8">
                    <section className="bg-[var(--color-surface-elevated)] p-6 rounded-lg border border-[var(--color-border-subtle)]">
                        <h3 className="text-lg font-bold text-[var(--color-brand-forest-light)] mb-3">
                            When to use this
                        </h3>
                        <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-secondary)]">
                            {article.whenToUse.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border-subtle)] pb-2">
                            How to do it
                        </h3>
                        <ol className="list-decimal pl-5 space-y-4 text-[var(--color-text-primary)]">
                            {article.steps.map((step, i) => (
                                <li key={i} className="pl-2">{step}</li>
                            ))}
                        </ol>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border-subtle)] pb-2">
                            What happens next
                        </h3>
                        <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-secondary)]">
                            {article.whatHappensNext.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </section>

                    {article.tips && article.tips.length > 0 && (
                        <section className="bg-[var(--color-accent-gold)]/10 p-6 rounded-lg border border-[var(--color-accent-gold)]/30">
                            <h3 className="text-lg font-bold text-[var(--color-accent-gold)] mb-3 flex items-center gap-2">
                                💡 Useful Tips
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-primary)]">
                                {article.tips.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>

                <div className="mt-12 pt-12 border-t border-[var(--color-border-subtle)] text-center text-[var(--color-text-secondary)]">
                    <p className="font-semibold mb-2">Still need help?</p>
                    <p className="text-sm">
                        Contact support at <a href="mailto:support@watershedcampground.com" className="text-[var(--color-accent-gold)] hover:underline">support@watershedcampground.com</a> or check another guide.
                    </p>
                </div>
            </article>
        </div>
    );
}
