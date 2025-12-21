"use client";

import { useState } from "react";
import { Search, BookOpen, ChevronRight } from "lucide-react";
import { HELP_CATEGORIES, searchHelp, HelpArticle } from "@/lib/help-content";

interface HelpCenterProps {
    onSelectArticle: (article: HelpArticle) => void;
}

export default function HelpCenter({ onSelectArticle }: HelpCenterProps) {
    const [query, setQuery] = useState("");
    const searchResults = query ? searchHelp(query) : [];

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header / Search */}
            <div className="text-center mb-12 py-8">
                <h1 className="text-4xl font-heading font-bold text-[var(--color-accent-gold)] mb-4">
                    How can we help?
                </h1>
                <div className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search for answers (e.g., 'blackout', 'refund', 'setup')..."
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-accent-gold)] focus:outline-none shadow-lg transition-all text-lg"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Results or Categories */}
            {query ? (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-[var(--color-text-muted)] uppercase tracking-wide">
                        Search Results
                    </h2>
                    {searchResults.length > 0 ? (
                        <div className="grid gap-4">
                            {searchResults.map(article => (
                                <button
                                    key={article.slug}
                                    onClick={() => onSelectArticle(article)}
                                    className="text-left p-6 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-surface-hover)] transition-all group"
                                >
                                    <h3 className="text-xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] mb-2 flex items-center justify-between">
                                        {article.title}
                                        <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-[var(--color-text-secondary)]">{article.summary}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-[var(--color-text-muted)]">
                            <p className="text-lg">No results found for &quot;{query}&quot;</p>
                            <button onClick={() => setQuery("")} className="text-[var(--color-accent-gold)] hover:underline mt-2">
                                Clear search
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Categories Grid */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {HELP_CATEGORIES.map(category => (
                            <div key={category.id} className="bg-[var(--color-surface-elevated)] p-6 rounded-xl border border-[var(--color-border-subtle)]">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-3xl">{category.icon}</span>
                                    <h2 className="text-2xl font-bold text-[var(--color-brand-forest-light)]">
                                        {category.title}
                                    </h2>
                                </div>
                                <ul className="space-y-3">
                                    {category.articles.map(article => (
                                        <li key={article.slug}>
                                            <button
                                                onClick={() => onSelectArticle(article)}
                                                className="flex items-start gap-2 text-left w-full hover:bg-[var(--color-surface-hover)] p-2 rounded transition-colors group"
                                            >
                                                <BookOpen className="w-4 h-4 mt-1 flex-shrink-0 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)]" />
                                                <span className="text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] font-medium">
                                                    {article.title}
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
