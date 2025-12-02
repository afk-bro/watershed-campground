import Link from "next/link";

type Props = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
};

const base = "relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:-translate-y-1 overflow-hidden";
const sizes = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};
const variants = {
  primary: "bg-[#c8b37e] text-brand-forest hover:bg-accent-gold shadow-md shadow-black/25 hover:shadow-xl hover:shadow-yellow-900/40 focus:ring-accent-gold ring-2 ring-[#8c6a0b]/30",
  secondary: "bg-accent-beige text-brand-forest hover:bg-accent-beige/90 hover:shadow-accent-beige/50 focus:ring-accent-beige",
};

export default function CTAButton({ label, href, onClick, variant = "primary", size = "md" }: Props) {
  const className = `${base} ${sizes[size]} ${variants[variant]}`;
  const content = (
    <>
      {/* Glossy highlight overlay */}
      <span className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
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
