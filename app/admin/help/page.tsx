"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Container from "@/components/Container";
import HelpCenter from "@/components/admin/help/HelpCenter";
import ArticleViewer from "@/components/admin/help/ArticleViewer";
import { getArticleBySlug, HelpArticle } from "@/lib/help-content";

export default function AdminHelpPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [currentArticle, setCurrentArticle] = useState<HelpArticle | null>(null);

    // Sync state with URL
    useEffect(() => {
        const slug = searchParams.get("article");
        if (slug) {
            const article = getArticleBySlug(slug);
            if (article) {
                setCurrentArticle(article);
            }
        } else {
            setCurrentArticle(null);
        }
    }, [searchParams]);

    const handleSelectArticle = (article: HelpArticle) => {
        router.push(`/admin/help?article=${article.slug}`);
    };

    const handleBack = () => {
        router.push("/admin/help");
    };

    return (
        <div className="py-12 min-h-screen bg-[var(--color-background)]">
            <Container>
                {currentArticle ? (
                    <ArticleViewer article={currentArticle} onBack={handleBack} />
                ) : (
                    <HelpCenter onSelectArticle={handleSelectArticle} />
                )}
            </Container>
        </div>
    );
}
