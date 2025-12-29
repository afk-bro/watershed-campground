const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

const pages = [
  // Public Pages
  { url: 'http://localhost:3000', name: 'home', category: 'public' },
  { url: 'http://localhost:3000/amenities', name: 'amenities', category: 'public' },
  { url: 'http://localhost:3000/rates', name: 'rates', category: 'public' },
  { url: 'http://localhost:3000/gallery', name: 'gallery', category: 'public' },
  { url: 'http://localhost:3000/contact', name: 'contact', category: 'public' },
  { url: 'http://localhost:3000/location', name: 'location', category: 'public' },
  { url: 'http://localhost:3000/book', name: 'book', category: 'public' },

  // Admin Pages
  { url: 'http://localhost:3000/admin/login', name: 'admin-login', category: 'admin' },
  { url: 'http://localhost:3000/admin', name: 'admin-dashboard', category: 'admin' },
  { url: 'http://localhost:3000/admin/calendar', name: 'admin-calendar', category: 'admin' },
  { url: 'http://localhost:3000/admin/campsites', name: 'admin-campsites', category: 'admin' },
];

const desktopConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
    },
  },
};

const mobileConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor: 'mobile',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1.6 * 1024,
      cpuSlowdownMultiplier: 4,
    },
  },
};

async function runLighthouse(url, name, config, formFactor = 'desktop') {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
  });

  try {
    const options = {
      logLevel: 'error',
      output: ['html', 'json'],
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options, config);

    const reportDir = path.join(__dirname, '..', 'lighthouse-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const htmlReport = runnerResult.report[0];
    const jsonReport = runnerResult.report[1];

    const filename = `${name}-${formFactor}`;
    await fs.writeFile(
      path.join(reportDir, `${filename}.html`),
      htmlReport
    );
    await fs.writeFile(
      path.join(reportDir, `${filename}.json`),
      jsonReport
    );

    const lhr = runnerResult.lhr;
    const scores = {
      performance: lhr.categories.performance?.score * 100 || 0,
      accessibility: lhr.categories.accessibility?.score * 100 || 0,
      bestPractices: lhr.categories['best-practices']?.score * 100 || 0,
      seo: lhr.categories.seo?.score * 100 || 0,
    };

    // Extract key performance metrics
    const metrics = {
      fcp: lhr.audits['first-contentful-paint']?.numericValue || 0,
      lcp: lhr.audits['largest-contentful-paint']?.numericValue || 0,
      tbt: lhr.audits['total-blocking-time']?.numericValue || 0,
      cls: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
      si: lhr.audits['speed-index']?.numericValue || 0,
    };

    return {
      url,
      name,
      formFactor,
      scores,
      metrics,
      allAudits: lhr.audits,
    };
  } finally {
    await chrome.kill();
  }
}

function formatMs(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 50) return '🟡';
  return '🔴';
}

async function main() {
  const testMode = process.argv[2] || 'both'; // 'desktop', 'mobile', or 'both'

  console.log('🚀 Starting Lighthouse Performance & Quality Audit');
  console.log('📊 Testing: Performance, Accessibility, Best Practices, SEO\n');
  console.log('⚠️  Make sure your dev server is running on http://localhost:3000');
  console.log('   Run: npm run dev\n');

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  const results = [];

  for (const page of pages) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📄 ${page.name.toUpperCase()} (${page.category})`);
    console.log(`${'='.repeat(70)}`);

    // Test desktop
    if (testMode === 'both' || testMode === 'desktop') {
      try {
        console.log('\n🖥️  Desktop Test...');
        const result = await runLighthouse(page.url, page.name, desktopConfig, 'desktop');
        results.push(result);

        console.log(`${getScoreEmoji(result.scores.performance)} Performance: ${result.scores.performance.toFixed(0)}/100`);
        console.log(`${getScoreEmoji(result.scores.accessibility)} Accessibility: ${result.scores.accessibility.toFixed(0)}/100`);
        console.log(`${getScoreEmoji(result.scores.bestPractices)} Best Practices: ${result.scores.bestPractices.toFixed(0)}/100`);
        console.log(`${getScoreEmoji(result.scores.seo)} SEO: ${result.scores.seo.toFixed(0)}/100`);
        console.log(`\n📊 Metrics:`);
        console.log(`   FCP: ${formatMs(result.metrics.fcp)} | LCP: ${formatMs(result.metrics.lcp)}`);
        console.log(`   TBT: ${formatMs(result.metrics.tbt)} | CLS: ${result.metrics.cls.toFixed(3)}`);
      } catch (error) {
        console.error(`❌ Desktop test failed: ${error.message}`);
        if (error.message.includes('ECONNREFUSED')) {
          console.error('   → Make sure the dev server is running!');
          return;
        }
      }
    }

    // Test mobile
    if (testMode === 'both' || testMode === 'mobile') {
      try {
        console.log('\n📱 Mobile Test...');
        const result = await runLighthouse(page.url, page.name, mobileConfig, 'mobile');
        results.push(result);

        console.log(`${getScoreEmoji(result.scores.performance)} Performance: ${result.scores.performance.toFixed(0)}/100`);
        console.log(`${getScoreEmoji(result.scores.accessibility)} Accessibility: ${result.scores.accessibility.toFixed(0)}/100`);
        console.log(`${getScoreEmoji(result.scores.bestPractices)} Best Practices: ${result.scores.bestPractices.toFixed(0)}/100`);
        console.log(`${getScoreEmoji(result.scores.seo)} SEO: ${result.scores.seo.toFixed(0)}/100`);
        console.log(`\n📊 Metrics:`);
        console.log(`   FCP: ${formatMs(result.metrics.fcp)} | LCP: ${formatMs(result.metrics.lcp)}`);
        console.log(`   TBT: ${formatMs(result.metrics.tbt)} | CLS: ${result.metrics.cls.toFixed(3)}`);
      } catch (error) {
        console.error(`❌ Mobile test failed: ${error.message}`);
      }
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📋 OVERALL SUMMARY');
  console.log(`${'='.repeat(70)}\n`);

  const avgScores = {
    performance: results.reduce((sum, r) => sum + r.scores.performance, 0) / results.length,
    accessibility: results.reduce((sum, r) => sum + r.scores.accessibility, 0) / results.length,
    bestPractices: results.reduce((sum, r) => sum + r.scores.bestPractices, 0) / results.length,
    seo: results.reduce((sum, r) => sum + r.scores.seo, 0) / results.length,
  };

  console.log('Average Scores Across All Pages:');
  console.log(`${getScoreEmoji(avgScores.performance)} Performance:    ${avgScores.performance.toFixed(1)}/100`);
  console.log(`${getScoreEmoji(avgScores.accessibility)} Accessibility:  ${avgScores.accessibility.toFixed(1)}/100`);
  console.log(`${getScoreEmoji(avgScores.bestPractices)} Best Practices: ${avgScores.bestPractices.toFixed(1)}/100`);
  console.log(`${getScoreEmoji(avgScores.seo)} SEO:            ${avgScores.seo.toFixed(1)}/100`);

  console.log(`\n📁 Reports saved to: ./lighthouse-reports/`);
  console.log('   Open HTML files in browser for detailed analysis\n');

  // Flag any pages with scores below 50
  const lowScores = results.filter(r =>
    r.scores.performance < 50 ||
    r.scores.accessibility < 50 ||
    r.scores.bestPractices < 50
  );

  if (lowScores.length > 0) {
    console.log('⚠️  Pages needing attention (scores < 50):');
    lowScores.forEach(r => {
      const issues = [];
      if (r.scores.performance < 50) issues.push('Performance');
      if (r.scores.accessibility < 50) issues.push('Accessibility');
      if (r.scores.bestPractices < 50) issues.push('Best Practices');
      console.log(`   - ${r.name} (${r.formFactor}): ${issues.join(', ')}`);
    });
    console.log('');
  }
}

main().catch(console.error);
