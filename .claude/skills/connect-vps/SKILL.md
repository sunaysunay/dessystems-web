---
description: Connect to the DES Systems VPS and run remote commands (promote, pm2, server admin)
user_invocable: true
---

# Connect to VPS

Connect to the DES Systems production VPS via SSH to run server commands like `promote.sh`, `pm2`, and other admin operations.

## Prerequisites

The environment must have:
- `SSH_PRIVATE_KEY` set as an environment secret (base64-encoded private key)
- `VPS_HOST` set as an environment variable (default: the server IP)
- The VPS hostname added to the environment's allowed network domains
- `openssh-client` installed (add to environment setup script: `apt-get install -y openssh-client`)

## Connection setup

```bash
mkdir -p ~/.ssh
echo "$SSH_PRIVATE_KEY" | base64 -d > ~/.ssh/vps_key
chmod 600 ~/.ssh/vps_key

cat > ~/.ssh/config << SSHEOF
Host des-vps
  HostName ${VPS_HOST}
  User root
  IdentityFile ~/.ssh/vps_key
  StrictHostKeyChecking no
  UserKnownHostsFile /dev/null
SSHEOF
chmod 600 ~/.ssh/config
```

## Common commands

### Promote dev to prod
```bash
ssh des-vps 'bash /root/scripts/promote.sh --confirm'
```

### Check running services
```bash
ssh des-vps 'pm2 list'
```

### Restart a service
```bash
ssh des-vps 'pm2 restart dessystems-console'
```

### View logs
```bash
ssh des-vps 'pm2 logs dessystems-console --lines 50'
```

### Run the screen validator
```bash
ssh des-vps 'cd /opt/dessystems-console-dev && node /root/scripts/bop-screen-validate.js --all'
```

## Usage

When the user says `/connect-vps` or asks to connect to the VPS:

1. Check that `SSH_PRIVATE_KEY` and `VPS_HOST` environment variables are set
2. If not set, tell the user to add them in the cloud environment settings (title bar → Edit environment → API credentials / Environment variables)
3. If set, run the connection setup commands above
4. Then run whatever command the user needs (default: test connection with `ssh des-vps 'hostname && uptime'`)

## Notes

- This skill requires environment configuration that is NOT in the git repo (SSH keys, network access)
- The VPS runs Ubuntu with pm2 for process management
- Dev instance: port 4401 at `/opt/dessystems-console-dev`
- Prod instance: port 4400 at `/opt/dessystems-console`
- Never edit prod directly — always edit dev, then promote with `promote.sh`
