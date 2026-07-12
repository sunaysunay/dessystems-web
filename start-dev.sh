#!/bin/bash
fuser -k 13009/tcp 2>/dev/null
sleep 1
npm run start
