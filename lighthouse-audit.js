const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

const pages = [
  { url: 'http://localhost:3000', name: 'home' },
  { url: 'http://localhost:3000/admin/login', name: 'admin-login' },
  { url: 'http://localhost:3000/admin', name: 'admin-dashboard' },
  { url: 'http://localhost:3000/amenities', name: 'amenities' },
];

const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['accessibility', 'best-practices'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  },
};

async function runLighthouse(url, name) {
  console.log(`\n🔍 Auditing: ${url}`);

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox'],
  });

  try {
    const options = {
      logLevel: 'info',
      output: ['html', 'json'],
      port: chrome.port,
    };

    const runnerResult = await lighthouse(url, options, config);

    const reportDir = path.join(__dirname, 'lighthouse-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const htmlReport = runnerResult.report[0];
    const jsonReport = runnerResult.report[1];

    await fs.writeFile(
      path.join(reportDir, `${name}.html`),
      htmlReport
    );
    await fs.writeFile(
      path.join(reportDir, `${name}.json`),
      jsonReport
    );

    const lhr = runnerResult.lhr;
    const accessibilityScore = lhr.categories.accessibility.score * 100;

    console.log(`✓ Accessibility Score: ${accessibilityScore}/100`);

    const contrastIssues = [];
    const audits = lhr.audits;

    if (audits['color-contrast'] && audits['color-contrast'].score !== 1) {
      const details = audits['color-contrast'].details;
      if (details && details.items) {
        contrastIssues.push(...details.items);
      }
    }

    if (contrastIssues.length > 0) {
      console.log(`\n⚠️  Found ${contrastIssues.length} color contrast issues:`);
      contrastIssues.forEach((issue, index) => {
        console.log(`\n  ${index + 1}. ${issue.node?.snippet || 'Unknown element'}`);
        if (issue.node?.explanation) {
          console.log(`     ${issue.node.explanation}`);
        }
      });
    } else {
      console.log('✓ No color contrast issues found');
    }

    return {
      url,
      name,
      accessibilityScore,
      contrastIssues: contrastIssues.length,
      allAudits: lhr.audits,
    };
  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log('🚀 Starting Lighthouse Accessibility Audit');
  console.log('📊 Focusing on accessibility and contrast issues\n');
  console.log('⚠️  Make sure your dev server is running on http://localhost:3000');
  console.log('   Run: npm run dev\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  const results = [];

  for (const page of pages) {
    try {
      const result = await runLighthouse(page.url, page.name);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error auditing ${page.url}:`, error.message);
      if (error.message.includes('ECONNREFUSED')) {
        console.error('   → Make sure the dev server is running!');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  results.forEach(result => {
    console.log(`\n${result.name}:`);
    console.log(`  Accessibility Score: ${result.accessibilityScore}/100`);
    console.log(`  Contrast Issues: ${result.contrastIssues}`);
  });

  console.log('\n📁 Reports saved to: ./lighthouse-reports/');
  console.log('   Open the HTML files in your browser for detailed results\n');

  const avgScore = results.reduce((sum, r) => sum + r.accessibilityScore, 0) / results.length;
  const totalIssues = results.reduce((sum, r) => sum + r.contrastIssues, 0);

  console.log(`Average Accessibility Score: ${avgScore.toFixed(1)}/100`);
  console.log(`Total Contrast Issues Found: ${totalIssues}\n`);
}

main().catch(console.error);
