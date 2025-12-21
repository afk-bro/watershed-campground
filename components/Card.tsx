type Props = {
  title: string;
  subtitle?: string;
  content?: React.ReactNode | string;
  imageSrc?: string;
  variant?: "default" | "outlined";
};

export default function Card({ title, subtitle, content, variant = "default" }: Props) {
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
