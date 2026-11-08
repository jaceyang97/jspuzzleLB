# Feedback delivery

The form posts to `/api/feedback`, a Vercel Node.js Function. It waits for Gmail SMTP to accept the message before showing success. Failed submissions retain the visitor's text.

Production environment variables:

- `GMAIL_ADDRESS`: the Gmail account used to send mail.
- `GMAIL_APP_PASSWORD`: an app password for that account, stored only in Vercel.
- `FEEDBACK_TO`: optional recipient; defaults to the existing scraper notification recipient, `jaceyang8@gmail.com`.

Credentials stay on the server. The endpoint fixes the sender, recipient, and subject; it accepts plain text up to 2,000 characters, checks the request origin, and rejects invalid bodies. A hidden field filters simple form bots.

The function also throttles each IP to three attempts per ten minutes in a warm instance. This counter is local to an instance. Configure a Vercel Firewall rate limit for POST `/api/feedback` before enabling production mail; use an IP counting key, three requests, and a ten-minute window. The firewall's counters are shared per Vercel region.

After changing environment variables, deploy a new build. Verify a real submission from the production form reaches the recipient's inbox, and check that error responses keep the draft available for retry.
