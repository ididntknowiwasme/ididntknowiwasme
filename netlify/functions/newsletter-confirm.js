// netlify/functions/newsletter-confirm.js
//
// Sends a "you're subscribed" confirmation email whenever someone submits
// the "newsletter" form. Netlify Forms calls this automatically via an
// outgoing webhook (configured in the dashboard) — you don't call this
// function from the frontend.
//
// Setup:
// 1. Sign up at https://resend.com (free tier: 100 emails/day, 3,000/month)
// 2. Verify a sending domain (or use their test domain while testing)
// 3. Create an API key
// 4. In Netlify: Site configuration -> Environment variables -> add
//      RESEND_API_KEY = re_xxxxxxxxxx
//      FROM_EMAIL = newsletter@yourdomain.co.za  (must be on a verified domain)
// 5. In Netlify: Forms -> newsletter -> Settings -> Add outgoing webhook
//      Event: New form submission
//      URL: https://www.ididntknowiwasme.co.za/.netlify/functions/newsletter-confirm

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Netlify's outgoing webhook payload shape:
  // { payload: { form_name: "newsletter", data: { name, email, ... } } }
  const payload = body.payload || {};
  if (payload.form_name !== 'newsletter') {
    // Not our form (e.g. the "contact" form also lives on this site) — ignore.
    return { statusCode: 200, body: 'Ignored: not newsletter form' };
  }

  const { name, email } = payload.data || {};
  if (!email) {
    return { statusCode: 400, body: 'Missing email in submission' };
  }

  const firstName = (name || '').trim().split(' ')[0] || 'friend';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "You're subscribed! 🎉",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Welcome, ${firstName}!</h2>
            <p>You're now subscribed to the I Didn't Know I Was Me newsletter.
               Devotionals, resources, and encouragement will land straight in
               your inbox — no spam, just truth.</p>
            <p>Glad to have you with us.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Resend API error:', res.status, errText);
      return { statusCode: 502, body: 'Failed to send confirmation email' };
    }

    return { statusCode: 200, body: 'Confirmation email sent' };
  } catch (err) {
    console.error('Unexpected error sending confirmation email:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
