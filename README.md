# Ciara

Securely deploy any application on any server.

- 🛠️ No DevOps Knowledge Required - Focus on your code. Ciara focuses on your deployment.
- 🗄️ VM OR Bare Metal - Deploy on any server, cloud or on-premises.
- 🗝️ Integrated Security - Define your firewall configs in your Ciara configuration. We also set Fail2ban for you.
- 🔧 Automatic OS updates - Leverage kpatch for automatic OS updates.
- ⚙️ Zero-Config OS Ready - No need for prior configuration required.
- ⏱️ Zero-Downtime Deployments - Deploy updates without service interruption.
- 🔒 Automatic HTTPS support - Don't worry about certificates renewal.

## Quickstart

On your project root, run the following command on your terminal:

```bash
ciara init
```

Output:

```bash
✔ What is your app name? my-website
✔ What is the IP address of the server? 127.0.0.1
✔ Which port is your application running on? 3000
✔ Would you like to set up a domain? Yes
✔ Enter your domain: example.com
ciara.config.json created.
```

## Deployment

To make your first deploy, all you need to do is run the following command in your terminal:

```bash
ciara deploy
```

That's it. Ciara takes care of all the rest. For further details and a complete guide, please refer to our official documentation: [Ciara Quickstart Guide](https://ciara-deploy.dev/quickstart.html).
