# Ciara

Securely deploy any application on any server.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/Documentation-Ciara-blue)](https://github.com/andresribeiro/ciara-docs)
![NPM Version](https://img.shields.io/npm/v/ciara-deploy)

- 🗄️ VM OR Bare Metal
- 🗝️ Integrated Firewall
- 🔧 Automatic security system updates
- ⚙️ Zero-Config OS Ready
- ⏱️ Zero-Downtime Deployments
- 🔒 Automatic HTTPS support
- 🛠️ Simple config file

## Quickstart

```bash
npm install -g ciara-deploy
cd your-project
ciara init
ciara deploy
```

## Requirements

- Servers: Debian OS (fresh install recommended)
- Local machine: Bun runtime

## Configuration

All settings are managed in ciara.config.json:

```json
{
  "appName": "my-website",
  "servers": [
    {
      "ip": "127.0.0.1",
      "port": 22
    }
  ],
  "ssh": {
    "privateKeyPath": "/root/.ssh/id_rsa"
  },
  "proxy": {
    "port": 3000
  },
  "healthcheck": {
    "path": "/",
    "interval": 5,
    "timeout": 3,
    "retries": 5
  },
  "firewall": {
    "inbound": [
      {
        "port": 22,
        "allow": "*",
        "protocols": [
          "udp"
        ]
      }
    ]
  },
  "updates": {
    "reboots": {
      "enabled": true,
      "time": "03:00"
    }
  },
  "builder": {
    "host": "127.0.0.1"
  }
}
```

That's it. Ciara takes care of all the rest. For further details and a complete guide, please refer to our official documentation: [Ciara Quickstart Guide](https://ciara-deploy.dev/quickstart.html).

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
