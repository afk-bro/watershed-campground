import Link from "next/link";

type Props = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

const base = "relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-1 overflow-hidden shadow-lg shadow-black/30 hover:shadow-2xl hover:[filter:brightness(1.03)]";
const sizes = {
  sm: "px-5 py-3 text-sm",
  md: "px-7 py-3.5 text-base",
  lg: "px-9 py-4.5 text-lg",
};
const variants = {
  primary: "bg-[#c8b37e] text-brand-forest hover:bg-accent-gold focus:ring-accent-gold ring-2 ring-[#8c6a0b]/30 border border-white/10",
  secondary: "bg-accent-beige text-brand-forest hover:bg-accent-beige/90 focus:ring-accent-beige border border-white/10",
};

export default function CTAButton({ label, href, onClick, variant = "primary", size = "md" }: Props) {
  const className = `${base} ${sizes[size]} ${variants[variant]}`;
  const content = (
    <>
      {/* Glossy highlight overlay */}
      <span className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
      {/* Subtle inset highlight for elevation */}
      <span className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none" />
      <span className="relative z-10">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button className={className} onClick={onClick}>
      {content}
    </button>
  );
}
