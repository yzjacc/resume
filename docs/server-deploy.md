# Server deployment

The production website is served by Nginx on the Finance server. Finance's
PM2 watcher and application are independent and must not be modified.

- Source repository: `/www/wwwroot/resume`, branch `main`.
- Build: `npm ci`, `npm run check`, `npm run build`, manifest validation.
- Published root: `/www/wwwroot/resume-site/current`.
- Versions: `/www/wwwroot/resume-site/releases/`.
- Scheduler: `resume-deploy.timer`, every 30 seconds after the previous run.

`deploy/resume-deploy.service` uses the server's Node 24 installation. Adjust
its PATH for a different machine. Install Chrome runtime libraries and Chinese
fonts before the first build. Puppeteer downloads its own browser during npm ci.
The service runs trusted repository code as root with the Chrome sandbox disabled;
it must never build untrusted pull requests.

Install the two unit files in `/etc/systemd/system/`, run `systemctl daemon-reload`
and `systemctl enable --now resume-deploy.timer`. Configure both resume Nginx
sites to use the published root after the first successful deployment. Leave
ACME verification roots and Finance configuration unchanged. Deny dotfiles,
use revalidation for HTML, and retain old hashed assets across deployments.

The script rejects dirty or divergent checkouts, uses a file lock, and builds
a Git archive in a temporary directory. Only a fully validated build is
published by an atomic symlink replacement. A failed build leaves the previous
site running and retries on the next timer run, even when Git already pulled
the commit. Versions are retained for rollback; monitor disk space and remove
unneeded old releases deliberately.

```sh
systemctl status resume-deploy.timer
journalctl -u resume-deploy.service -n 80 --no-pager
cat /www/wwwroot/resume-site/current/.release-sha
systemctl start resume-deploy.service
```

To roll back, stop the timer and atomically point `current` at a retained release.
Fix or revert the source commit before restarting automatic deployment.
Changes to unit files require reinstalling them and `systemctl daemon-reload`;
changes to the script take effect on the next run after Git updates the checkout.
