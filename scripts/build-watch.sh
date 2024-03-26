#!/bin/bash

# Define paths to your TypeScript config files
TS_CONFIG_1="./tsconfig-esm.json"
TS_CONFIG_2="./tsconfig-cjs.json"

# Function to kill background processes on script exit
cleanup() {
  echo "Killing background tsc processes..."
  kill $TSC_PID_1 $TSC_PID_2
}

# Start tsc --watch for both configurations in the background
tsc --watch -p "$TS_CONFIG_1" &
TSC_PID_1=$!
tsc --watch -p "$TS_CONFIG_2" &
TSC_PID_2=$!

# Trap SIGINT (Ctrl+C) and SIGTERM (kill) signals and call cleanup
trap cleanup SIGINT SIGTERM

# Wait for tsc processes to exit (in case they are stopped manually)
wait $TSC_PID_1 $TSC_PID_2

# Optional: cleanup upon normal script exit (though trap should handle most cases)
cleanup
