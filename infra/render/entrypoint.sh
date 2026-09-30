#!/bin/sh
# Render's free plan doesn't support preDeployCommand, so migrations run
# here instead, as the first step of every container boot (see
# migrate-all.js for why that's safe to repeat on every free-tier cold
# start) before handing off to pm2-runtime for the actual app processes.
set -e
node /workspace/infra/render/migrate-all.js
exec pm2-runtime start /workspace/infra/render/ecosystem.config.js
