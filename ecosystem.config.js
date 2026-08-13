// DESPANEL-V2 — pm2 process definitions for the console.
module.exports = {
  apps: [
    {
      name: 'dessystems-console',
      script: '.next/standalone/server.js',
      cwd: '/opt/dessystems-console',
      env: {
        PORT: 4400,
        HOSTNAME: '0.0.0.0',
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=1024',
      },
      max_memory_restart: '1200M',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      time: true,
    },
    // Dev process: cd /opt/dessystems-console-dev && PORT=4401 pm2 start 'npm run dev' --name dessystems-console-dev
    {
      name: 'die-worker-dev',
      script: 'scripts/die-worker.mjs',
      cwd: '/opt/dessystems-console-dev',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://ttydqyiezarpdysqacaa.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWRxeWllemFycGR5c3FhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzMzMyNCwiZXhwIjoyMDg3NTA5MzI0fQ.8GDRoL2HYXvbcW-0MD9cXUmWEJKLutTj4RJQcvXAVdI',
        NODE_ENV: 'development',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '128M',
      time: true,
    },
    {
      name: 'ops-sla-cron',
      script: 'scripts/ops-sla-cron.mjs',
      cwd: '/opt/dessystems-console-dev',
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'https://ttydqyiezarpdysqacaa.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0eWRxeWllemFycGR5c3FhY2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzMzMyNCwiZXhwIjoyMDg3NTA5MzI0fQ.8GDRoL2HYXvbcW-0MD9cXUmWEJKLutTj4RJQcvXAVdI',
        NODE_ENV: 'development',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '64M',
      time: true,
    },
    {
      name: 'ops-goals-cron',
      script: 'scripts/ops-goals-cron.mjs',
      cwd: '/opt/dessystems-console-dev',
      cron_restart: '0 2 * * *',
      autorestart: false,
      env: {
        NODE_ENV: 'development',
      },
      time: true,
    },
    {
      name: 'ops-recurrence-cron',
      script: 'scripts/ops-recurrence-cron.mjs',
      cwd: '/opt/dessystems-console-dev',
      cron_restart: '0 6 * * *',
      autorestart: false,
      env: {
        NODE_ENV: 'development',
      },
      time: true,
    },
  ],
};
