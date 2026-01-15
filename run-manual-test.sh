#!/bin/bash
# Simple validation test runner

echo "🚀 Starting local server on port 8001..."
cd /home/stephane/GitHub/pensine-web
python3 -m http.server 8001 &
SERVER_PID=$!

sleep 2

echo ""
echo "📋 Manual test URL: http://localhost:8001/test-validation-manual.html"
echo ""
echo "✅ Server running (PID: $SERVER_PID)"
echo "📝 Instructions:"
echo "   1. Open http://localhost:8001/test-validation-manual.html in browser"
echo "   2. Click 'Test Validation' button"
echo "   3. Check console for results"
echo ""
echo "🛑 To stop server: kill $SERVER_PID"
echo ""
