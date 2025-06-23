# Ciara

Deploy any application in `N` servers in `4` minutes from your terminal

- 🛠️ No DevOps Knowledge Required - Focus on your code. Ciara focus on your deployment.
- 🗄️ VM OR Bare Metal - Deploy on any server, cloud or on-premises.
- 🗝️ Integrated Security - Define your firewall configs in your Ciara configuration. We also set Fail2ban for you.
- 🔧 Automatic OS updates - Leverage kpatch for automatic OS updates.
- ⚙️ Zero-Config OS Ready - No need for prior configuration required.
- ⏱️ Zero-Downtime Deployments - Deploy updates without service interruption.
- 🔒 Automatic HTTPS support - Don't worry about certificates renewal.
- ➕ Multiple apps - Deploy multipe apps on the same server.

## Quickstart

On your project root, run the following command on your terminal:

```bash
ciara init
```

Output:

```bash
✔ What is the IP address of the server? 127.0.0.1
✔ Is SSH running on the default port (22)? Yes
✔ What is your SSH user for connecting to the server? root
✔ Which port is your application running on?: 3000
✔ Would you like to setup a domain? Yes
✔ Enter your domain: api.example.com
Successfully created ciara.config.json
```

## Deployment

To make your first deploy, all you need to do is run the following command in your terminal:

```bash
ciara deploy
```

That's it. Ciara takes care of all the rest. For further details and a complete guide, please refer to our official documentation: [Ciara Quickstart Guide](https://ciara-deploy.dev/quickstart.html).
