type Props = {
  title: string;
  subtitle?: string;
  content?: React.ReactNode | string;
  imageSrc?: string;
  variant?: "default" | "outlined";
};

export default function Card({ title, subtitle, content, variant = "default" }: Props) {
  const base = "rounded-lg p-6 shadow-sm h-full flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1";
  const style = variant === "outlined"
    ? "border border-accent-beige/40 hover:border-accent-gold/30"
    : "bg-brand-forest/80 border border-accent-gold/10 hover:bg-brand-forest/90";
  return (
    <div className={`${base} ${style} items-center text-center`}>
      <h3 className="font-heading text-2xl text-accent-gold">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-accent-beige/80">{subtitle}</p>}
      {content && <div className="mt-auto pt-4 text-accent-beige/90">{content}</div>}
    </div>
  );
}
