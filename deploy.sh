#!/bin/bash
set -e

# nvm use
npm i

# create layer dir
if [ ! -d "layer" ]; then
  mkdir -p layer/nodejs && cd layer/nodejs && ln -s ../../node_modules/ node_modules && cd ../..
fi

sls deploy

