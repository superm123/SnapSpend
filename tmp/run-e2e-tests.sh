#!/bin/bash

# Ensure port 3000 is clear
echo "Attempting to kill any process on port 3000..."
kill-port 3000 || echo "No process found on port 3000 or kill-port failed (ignoring)"

# Start Next.js development server in the background
echo "Starting Next.js development server..."
npm run dev &
DEV_SERVER_PID=$! # Capture PID of the background process

# Wait for the server to be ready
echo "Waiting for Next.js server to be ready at http://localhost:3000..."
wait-on http://localhost:3000 -t 60000 # Wait with a 60-second timeout
if [ $? -ne 0 ]; then
  echo "Error: Next.js server did not start in time."
  kill $DEV_SERVER_PID # Kill the dev server if wait-on fails
  exit 1
fi
echo "Next.js server is ready."

# Run Playwright tests
echo "Running Playwright tests..."
npx playwright test
TEST_EXIT_CODE=$?

# Kill the Next.js development server
echo "Killing Next.js development server (PID: $DEV_SERVER_PID)..."
kill $DEV_SERVER_PID || echo "Could not kill process with PID $DEV_SERVER_PID"

echo "E2E tests finished with exit code $TEST_EXIT_CODE"
exit $TEST_EXIT_CODE
