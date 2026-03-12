#!/bin/bash
cd "$(dirname "$0")"
export PATH="$(pwd)/.node/bin:$PATH"
export NPM_CONFIG_CACHE="$(pwd)/.npm-cache"
exec npm run "${1:-dev}"
