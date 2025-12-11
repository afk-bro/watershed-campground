# Deployment Guide - The Watershed Campground

This guide covers deploying The Watershed Campground website to production.

## Deployment Platforms

### Vercel (Recommended)

Vercel is the recommended platform for deploying Next.js applications, offering zero-configuration deployment, automatic HTTPS, and global CDN.

#### Initial Setup

1. **Create Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Connect your GitHub account

2. **Import Project**
   - Click "New Project" in Vercel dashboard
   - Import your GitHub repository
   - Vercel will auto-detect Next.js configuration

3. **Configure Environment Variables**
   
   Add these in Vercel Project Settings → Environment Variables:
   
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   NEXT_PUBLIC_SITE_URL=https://thewatershedcampground.com
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Every push to `main` triggers a new deployment

#### Custom Domain

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add `thewatershedcampground.com`

2. **Configure DNS**
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or use Vercel nameservers for full DNS management

3. **SSL Certificate**
   - Automatically provisioned by Vercel
   - HTTPS enabled by default

### Alternative Platforms

#### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Deploy
netlify deploy --prod
```

#### Self-Hosted (VPS/Cloud)

```bash
# Build the project
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "watershed" -- start
```

## Pre-Deployment Checklist

### 1. Environment Variables
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` configured
- [ ] `NEXT_PUBLIC_SITE_URL` set to production URL

### 2. Content Review
- [ ] All contact information is accurate
- [ ] Social media links are updated
- [ ] Gallery images are optimized
- [ ] Rates and pricing are current

### 3. SEO Configuration
- [ ] Update `lib/metadata.ts` with correct site URL
- [ ] Verify sitemap generates correctly
- [ ] Test Open Graph tags with [OpenGraph.xyz](https://www.opengraph.xyz/)
- [ ] Test Twitter Cards with [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 4. Performance Testing
- [ ] Run Lighthouse audit (target: 90+ performance)
- [ ] Test on mobile devices
- [ ] Verify image optimization (AVIF/WebP)
- [ ] Check Core Web Vitals

### 5. Functionality Testing
- [ ] Test all navigation links
- [ ] Verify contact form submission
- [ ] Test gallery lightbox
- [ ] Check mobile menu
- [ ] Test keyboard navigation

## Post-Deployment Tasks

### 1. Google Analytics Setup

1. **Create GA4 Property**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create new GA4 property
   - Copy Measurement ID (G-XXXXXXXXXX)

2. **Add to Environment Variables**
   - Update `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel
   - Redeploy to activate tracking

3. **Verify Tracking**
   - Visit site and check GA4 Real-time reports
   - Verify page views are being tracked

### 2. Search Engine Submission

1. **Google Search Console**
   - Add property at [search.google.com/search-console](https://search.google.com/search-console)
   - Verify ownership via DNS or HTML file
   - Submit sitemap: `https://thewatershedcampground.com/sitemap.xml`

2. **Bing Webmaster Tools**
   - Add site at [bing.com/webmasters](https://www.bing.com/webmasters)
   - Submit sitemap

### 3. Performance Monitoring

1. **Set up Vercel Analytics** (optional)
   - Enable in Vercel dashboard
   - Monitor Core Web Vitals

2. **Regular Lighthouse Audits**
   - Run monthly audits
   - Track performance trends

### 4. Social Media Preview Testing

Test how your site appears when shared:
- **Facebook**: [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug/)
- **Twitter**: [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)
- **LinkedIn**: [linkedin.com/post-inspector](https://www.linkedin.com/post-inspector/)

## Continuous Deployment

### Automatic Deployments

With Vercel, every push to `main` triggers a deployment:

```bash
git add .
git commit -m "Update content"
git push origin main
```

### Preview Deployments

Every pull request gets a preview deployment:
- Unique URL for testing
- Automatic cleanup after merge

## Rollback Procedure

If issues arise after deployment:

1. **Vercel Dashboard**
   - Go to Deployments
   - Find previous working deployment
   - Click "Promote to Production"

2. **Git Revert**
   ```bash
   git revert HEAD
   git push origin main
   ```

## Monitoring & Maintenance

### Weekly Tasks
- [ ] Check Google Analytics for traffic
- [ ] Review error logs in Vercel
- [ ] Test contact form functionality

### Monthly Tasks
- [ ] Run Lighthouse performance audit
- [ ] Update content if needed
- [ ] Check for dependency updates

### Quarterly Tasks
- [ ] Review and update rates
- [ ] Refresh gallery images
- [ ] Update seasonal content

## Troubleshooting

### Build Failures

**Error: Type checking failed**
```bash
npm run type-check
# Fix TypeScript errors, then redeploy
```

**Error: Linting failed**
```bash
npm run lint
# Fix linting errors, then redeploy
```

### Performance Issues

**Slow image loading**
- Verify images are in AVIF/WebP format
- Check image sizes are appropriate
- Ensure Next.js Image component is used

**Low Lighthouse scores**
- Review Lighthouse report recommendations
- Check for render-blocking resources
- Verify font loading strategy

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)

---

**Last Updated**: December 2025
