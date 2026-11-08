const nodemailer = require('nodemailer');

const submissions = new Map();
const windowMs = 10 * 60 * 1000;

module.exports = async function feedback(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to send feedback.' });
  }

  const origins = new Set(['https://jspuzzle-lb.vercel.app']);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) origins.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (process.env.VERCEL_ENV !== 'production' && process.env.VERCEL_URL) origins.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV === 'development') origins.add('http://localhost:3000');
  if (!origins.has(req.headers.origin)) return res.status(403).json({ error: 'Send feedback from the leaderboard page.' });
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return res.status(415).json({ error: 'Send feedback as JSON.' });
  }
  if (Number(req.headers['content-length']) > 12000) return res.status(413).json({ error: 'Feedback is too long.' });

  let body;
  try {
    body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'The feedback could not be read.' });
  }
  if (!body || Array.isArray(body) || typeof body !== 'object') return res.status(400).json({ error: 'Enter your feedback.' });
  if (body.website) return res.status(200).json({ ok: true });
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) return res.status(400).json({ error: 'Enter between 1 and 2,000 characters.' });

  const sender = process.env.GMAIL_ADDRESS?.trim();
  const password = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');
  const recipient = process.env.FEEDBACK_TO?.trim() || 'jaceyang8@gmail.com';
  if (!sender || !password) {
    console.error(JSON.stringify({ event: 'feedback_not_configured' }));
    return res.status(503).json({ error: 'Feedback is temporarily unavailable. Please try again later.' });
  }

  const now = Date.now();
  for (const [key, record] of submissions) if (record.expires <= now) submissions.delete(key);
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const previous = submissions.get(ip);
  if (previous?.count >= 3 || (!previous && submissions.size >= 500)) {
    res.setHeader('Retry-After', String(Math.ceil(((previous?.expires || now + windowMs) - now) / 1000)));
    return res.status(429).json({ error: 'Please wait a few minutes before sending more feedback.' });
  }
  submissions.set(ip, { count: (previous?.count || 0) + 1, expires: previous?.expires || now + windowMs });

  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: sender, pass: password },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: { name: 'JSPuzzle Leaderboard', address: sender },
      to: recipient,
      subject: '[JS Puzzle] Website feedback',
      text: `${message}\n\n---\nSent from the leaderboard feedback form.\n${new Date(now).toISOString()}`,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (!result.accepted?.some(address => address.toLowerCase() === recipient.toLowerCase())) {
      throw Object.assign(new Error('Recipient was not accepted'), { code: 'RECIPIENT_REJECTED' });
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: 'feedback_send_failed', code: error.code || 'SMTP_ERROR' }));
    return res.status(502).json({ error: 'Your feedback could not be sent. Please try again.' });
  }
};
