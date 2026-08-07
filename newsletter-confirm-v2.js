// netlify/functions/newsletter-confirm.js
//
// Sends a "you're subscribed" confirmation email whenever someone submits
// the "newsletter" form. Netlify Forms calls this automatically via an
// outgoing webhook configured in the dashboard.

exports.handler = async (event) => {
  // Log everything we receive first, before any early returns, so the
  // Netlify function log always shows what actually came in.
  console.log('newsletter-confirm invoked. Method:', event.httpMethod);
  console.log('Raw body:', event.body);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    console.error('Failed to parse JSON body:', err.message);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Netlify's outgoing webhook has been observed both wrapped in a
  // top-level "payload" key and unwrapped, depending on version/event.
  // Handle both shapes defensively.
  const submission = body.payload || body;
  const formName = submission.form_name;
  const data = submission.data || {};

  console.log('Resolved form_name:', formName, '| data:', JSON.stringify(data));

  if (formName !== 'newsletter') {
    console.log('Ignoring: form_name was not "newsletter"');
    return { statusCode: 200, body: 'Ignored: not newsletter form' };
  }

  const { name, email } = data;
  if (!email) {
    console.error('No email found in submission data');
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

    const resText = await res.text();
    console.log('Resend API response status:', res.status, '| body:', resText);

    if (!res.ok) {
      return { statusCode: 502, body: 'Failed to send confirmation email' };
    }

    return { statusCode: 200, body: 'Confirmation email sent' };
  } catch (err) {
    console.error('Unexpected error sending confirmation email:', err.message);
    return { statusCode: 500, body: 'Internal error' };
  }
};
