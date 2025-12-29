/**
 * Props for Card component
 *
 * Generic card component with title, subtitle, and content area.
 */
interface CardProps {
  /** Card title (required) */
  title: string;

  /** Optional subtitle text */
  subtitle?: string;

  /** Optional content to display in the card body */
  content?: React.ReactNode | string;

  /** Optional image source URL (currently unused but kept for future enhancement) */
  imageSrc?: string;

  /** Visual variant - default has background, outlined has border only */
  variant?: "default" | "outlined";
}

export default function Card({ title, subtitle, content, variant = "default" }: CardProps) {
  const base = "rounded-lg p-6 shadow-sm h-full flex flex-col hover-lift hover:shadow-lg transition-surface";
  const style = variant === "outlined"
    ? "border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
    : "bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-elevated)]";
  return (
    <div className={`${base} ${style} items-center text-center`}>
      <h3 className="font-heading text-2xl text-[var(--color-text-accent)]">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>}
      {content && <div className="mt-auto pt-4 text-[var(--color-text-primary)]">{content}</div>}
    </div>
  );
}
