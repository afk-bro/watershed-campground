#!/bin/bash

# Create reports directory
mkdir -p lighthouse-reports

echo "🚀 Starting Lighthouse Accessibility Audit"
echo "📊 Focusing on accessibility and contrast issues"
echo ""

# Pages to audit
declare -a pages=(
  "http://localhost:3000|home"
  "http://localhost:3000/admin/login|admin-login"
  "http://localhost:3000/admin|admin-dashboard"
  "http://localhost:3000/amenities|amenities"
)

# Run audits
for page in "${pages[@]}"; do
  IFS='|' read -r url name <<< "$page"
  echo "🔍 Auditing: $url"

  npx lighthouse "$url" \
    --only-categories=accessibility \
    --output=html \
    --output=json \
    --output-path="./lighthouse-reports/$name" \
    --chrome-flags="--headless --no-sandbox" \
    --quiet

  if [ $? -eq 0 ]; then
    echo "✓ Audit completed for $name"
  else
    echo "❌ Audit failed for $name"
  fi
  echo ""
done

echo "============================================================"
echo "📁 Reports saved to: ./lighthouse-reports/"
echo "   Open the HTML files in your browser for detailed results"
echo "============================================================"
echo ""

# Extract and display contrast issues from JSON reports
echo "📋 CONTRAST ISSUES SUMMARY:"
echo ""

for page in "${pages[@]}"; do
  IFS='|' read -r url name <<< "$page"
  json_file="./lighthouse-reports/$name.report.json"

  if [ -f "$json_file" ]; then
    score=$(jq -r '.categories.accessibility.score * 100' "$json_file" 2>/dev/null)
    contrast_score=$(jq -r '.audits["color-contrast"].score' "$json_file" 2>/dev/null)

    echo "📄 $name:"
    echo "   Accessibility Score: ${score}/100"

    if [ "$contrast_score" != "1" ] && [ "$contrast_score" != "null" ]; then
      echo "   ⚠️  Color Contrast Issues Found!"

      # Extract contrast issue details
      jq -r '.audits["color-contrast"].details.items[]? | "      - " + (.node.snippet // "Unknown element")' "$json_file" 2>/dev/null
    else
      echo "   ✓ No contrast issues"
    fi
    echo ""
  fi
done
