// netlify/functions/newsletter-confirm.js
//
// Sends a welcome email whenever someone submits the "newsletter" form.
// Netlify Forms calls this automatically via an outgoing webhook
// (Site configuration -> Emails and webhooks -> Form submission notifications).

exports.handler = async (event) => {
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

  // Netlify's webhook payload has been observed both wrapped in a
  // top-level "payload" key and unwrapped — handle both shapes.
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
        from: `I Didn't Know I Was Me <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Welcome to the newsletter',
        html: `
          <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; background-color: #FFF8F0; padding: 40px 32px; border-radius: 8px;">
            <img src="https://www.ididntknowiwasme.co.za/logo-orange.png" alt="I Didn't Know I Was Me" style="height: 40px; margin-bottom: 28px;">
            <h1 style="font-size: 22px; color: #1A1410; margin: 0 0 16px;">You're in, ${firstName} 🤍</h1>
            <p style="font-size: 15px; line-height: 1.6; color: #3a332c; margin: 0 0 16px;">
              Thank you for joining the I Didn't Know I Was Me family. We're
              genuinely glad you're here.
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #3a332c; margin: 0 0 16px;">
              Every devotional, story, and resource we send is written to
              remind you of one thing: your true identity isn't something you
              have to earn or search for. It's already yours in Christ. We
              hope what lands in your inbox meets you right where you are.
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #3a332c; margin: 0 0 28px;">
              We respect your inbox — no spam, just truth, whenever we have
              something worth sharing.
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #3a332c; margin: 0;">
              Glad to have you with us,<br>
              <strong>The IDKIWM Team</strong>
            </p>
          </div>
        `,
        text: `You're in, ${firstName}!\n\nThank you for joining the I Didn't Know I Was Me family. We're genuinely glad you're here.\n\nEvery devotional, story, and resource we send is written to remind you of one thing: your true identity isn't something you have to earn or search for. It's already yours in Christ. We hope what lands in your inbox meets you right where you are.\n\nWe respect your inbox — no spam, just truth, whenever we have something worth sharing.\n\nGlad to have you with us,\nThe IDKIWM Team`,
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
