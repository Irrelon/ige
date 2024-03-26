#!/bin/bash

# Define paths to your TypeScript config files
TS_CONFIG_1="./tsconfig-esm.json"
TS_CONFIG_2="./tsconfig-cjs.json"

# Start tsc --watch for both configurations in the background
tsc --watch -p "$TS_CONFIG_1" &
TSC_PID_1=$!
tsc --watch -p "$TS_CONFIG_2" &
TSC_PID_2=$!

# Delay execution of the next command
sleep 6

npx @irrelon/fix-paths -p ./tsconfig-esm.json -i "**/*.js, **/*.ts" --write --watch &
NPX_PID_1=$!

npx @irrelon/fix-paths -p ./tsconfig-cjs.json -i "**/*.js, **/*.ts" --write --watch &
NPX_PID_2=$!

# Function to kill background processes on script exit
cleanup() {
  echo "Killing background tsc processes..."
  kill $TSC_PID_1 $TSC_PID_2 NPX_PID_1 NPX_PID_2
}

# Trap SIGINT (Ctrl+C) and SIGTERM (kill) signals and call cleanup
trap cleanup SIGINT SIGTERM

# Wait for tsc processes to exit (in case they are stopped manually)
wait $TSC_PID_1 $TSC_PID_2 $NPX_PID_1 NPX_PID_2

# Optional: cleanup upon normal script exit (though trap should handle most cases)
cleanup
