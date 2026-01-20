#!/bin/bash
# 🚀 Publication @panini/plugin-interface@0.1.0-alpha.1
# Date: 2026-01-14
# Phase: 1.3 - Publish Alpha

set -e  # Exit on error

echo "📦 Publishing @panini/plugin-interface@0.1.0-alpha.1..."
echo ""

# Change to package directory
cd packages/plugin-interface

# Step 1: Verify build
echo "Step 1/5: Verifying build..."
if [ ! -d "dist" ]; then
  echo "❌ Error: dist/ folder not found. Run 'npm run build' first."
  exit 1
fi
echo "✅ dist/ folder exists"

# Step 2: Verify tests
echo ""
echo "Step 2/5: Running tests..."
npm test
echo "✅ All tests passed"

# Step 3: Verify npm login
echo ""
echo "Step 3/5: Checking npm authentication..."
if ! npm whoami > /dev/null 2>&1; then
  echo "❌ Not logged in to npm. Running 'npm login'..."
  npm login
else
  USER=$(npm whoami)
  echo "✅ Logged in as: $USER"
fi

# Step 4: Dry run (optional, comment out to skip)
echo ""
echo "Step 4/5: Dry run (preview publish)..."
npm publish --dry-run --tag alpha
echo "✅ Dry run successful"

# Step 5: Actual publish
echo ""
echo "Step 5/5: Publishing to npm..."
read -p "Ready to publish @panini/plugin-interface@0.1.0-alpha.1? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm publish --tag alpha
  echo ""
  echo "🎉 Package published successfully!"
  echo ""
  echo "Verify at: https://www.npmjs.com/package/@panini/plugin-interface"
  echo ""
  echo "Install with: npm install @panini/plugin-interface@alpha"
else
  echo "❌ Publish cancelled"
  exit 1
fi

# Return to root
cd ../..

echo ""
echo "✅ Publication complete!"
echo ""
echo "Next steps:"
echo "  1. Verify package: npm info @panini/plugin-interface"
echo "  2. Create GitHub release: git tag v0.1.0-alpha.1 && git push origin v0.1.0-alpha.1"
echo "  3. Test installation in new project"
echo "  4. Update Pensine to use published package"
