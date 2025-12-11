# The Watershed Campground

> **Portfolio Project**: A modern, production-ready website for a family-owned lakeside campground on Kootenay Lake, British Columbia.

![The Watershed Campground](./public/gallery/banner.avif)

## 🌟 Project Overview

This is a complete website rebuild for The Watershed Campground, transforming their online presence with modern web technologies, exceptional performance, and professional polish. Built as a portfolio showcase project demonstrating full-stack web development capabilities.

**Live Demo**: [thewatershedcampground.com](https://thewatershedcampground.com) *(deployment pending)*

## ✨ Key Features

### User Experience
- **Immersive Hero Sections** with parallax scrolling and reduced motion support
- **Interactive Gallery** with lightbox navigation and keyboard controls
- **Responsive Design** optimized for mobile, tablet, and desktop
- **Smooth Animations** with accessibility-first approach
- **Custom 404 Page** with helpful navigation

### SEO & Performance
- **Perfect SEO Score** with comprehensive meta tags (Open Graph, Twitter Cards)
- **Structured Data** (JSON-LD) for local business optimization
- **Automatic Sitemap** generation for search engines
- **Image Optimization** with AVIF/WebP formats
- **Security Headers** for production deployment
- **PWA Support** with web app manifest

### Accessibility
- **WCAG AA Compliant** color contrast and typography
- **Keyboard Navigation** throughout the site
- **Screen Reader Optimized** with proper ARIA labels
- **Reduced Motion Support** respecting user preferences

## 🛠️ Tech Stack

### Core Technologies
- **[Next.js 16](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling

### Development Tools
- **ESLint** - Code quality and consistency
- **Google Fonts** - Cormorant Garamond & Inter typography
- **Next.js Image Optimization** - Automatic image optimization

### Production Features
- **Google Analytics 4** - User analytics and tracking
- **Security Headers** - HSTS, CSP, X-Frame-Options, etc.
- **Sitemap & Robots.txt** - SEO optimization
- **PWA Manifest** - Progressive web app support

## 📁 Project Structure

```
watershed-campground/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with metadata
│   ├── page.tsx           # Homepage
│   ├── gallery/           # Photo gallery
│   ├── rates/             # Pricing information
│   ├── amenities/         # Campground features
│   ├── things-to-do/      # Local activities
│   ├── contact/           # Contact form & map
│   ├── make-a-reservation/# Booking page
│   ├── rules/             # Campground rules
│   ├── sitemap.ts         # Dynamic sitemap
│   ├── robots.ts          # Robots.txt config
│   ├── manifest.ts        # PWA manifest
│   └── not-found.tsx      # Custom 404 page
├── components/            # Reusable React components
│   ├── Navbar.tsx         # Sticky navigation
│   ├── Hero.tsx           # Parallax hero sections
│   ├── Footer.tsx         # Site footer
│   ├── ImageLightbox.tsx  # Gallery lightbox
│   └── ...
├── lib/                   # Utility functions
│   ├── metadata.ts        # SEO metadata helpers
│   ├── analytics.ts       # Google Analytics setup
│   └── navLinks.ts        # Navigation configuration
└── public/                # Static assets
    └── gallery/           # Campground images
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/watershed-campground.git
   cd watershed-campground
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Run linter
npm run lint
```

## 📦 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Deploy to Vercel**
   - Import project at [vercel.com/new](https://vercel.com/new)
   - Configure environment variables (see below)
   - Deploy automatically on every push

### Environment Variables

Create a `.env.local` file for local development:

```env
# Google Analytics (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Site URL (for metadata)
NEXT_PUBLIC_SITE_URL=https://thewatershedcampground.com
```

## 🎨 Design System

### Color Palette
- **Brand Forest**: `#06251c` - Primary background
- **Navbar Forest**: `#042c21` - Navigation background
- **Accent Gold**: `#c8a75a` - CTAs, headings, active states
- **Accent Beige**: `#e9dfc7` - Body text

### Typography
- **Headings**: Cormorant Garamond (serif)
- **Body**: Inter (sans-serif)

### Spacing System
Consistent vertical rhythm with predefined spacing tokens for sections and content.

## 📊 Performance Metrics

Target Lighthouse scores:
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 100

## 🤝 Contributing

This is a portfolio project, but suggestions and feedback are welcome!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Developer

**Your Name**
- Portfolio: [yourportfolio.com](https://yourportfolio.com)
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Name](https://linkedin.com/in/yourname)

## 🙏 Acknowledgments

- The Watershed Campground for the opportunity to rebuild their website
- Next.js team for the amazing framework
- Vercel for hosting and deployment platform

---

**Built with ❤️ using Next.js 16, React 19, and TypeScript**
