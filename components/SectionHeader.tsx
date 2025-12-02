type Props = {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  showDivider?: boolean;
};

export default function SectionHeader({ title, subtitle, align = "center", showDivider = false }: Props) {
  const alignment = align === "center" ? "text-center" : "text-left";
  const dividerAlign = align === "center" ? "mx-auto" : "";

  return (
    <div className={`mb-10 ${alignment}`}>
      <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-accent-gold-dark tracking-wide leading-tight mb-3">
        {title}
      </h2>
      {showDivider && (
        <div className={`w-24 h-px bg-gradient-to-r from-accent-gold/60 ${align === "center" ? "via-accent-gold/60" : ""} to-transparent ${dividerAlign}`} />
      )}
      {subtitle && (
        <p className="mt-4 text-base sm:text-lg text-accent-beige/90 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
