// netlify/functions/newsletter-digest.js
//
// Weekly schedule (see netlify.toml). Emails subscribers a digest of posts
// published in the last 7 days. Sends nothing if there are no new posts.
//
// Test mode: set a TEST_EMAIL env var in Netlify. When set, the digest goes
// ONLY to that address. Delete TEST_EMAIL when you are done testing.

const SITE_URL = 'https://www.ididntknowiwasme.co.za';
const NETLIFY_SITE_ID = '72147931-f604-42b4-9b24-b95f32df8dfd';
const NETLIFY_FORM_ID = '6a7526074934f20008121a5d';
const DAYS_BACK = 7;

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function getRecentPosts() {
  const indexUrl = `${SITE_URL}/posts-index.json`;
  const indexRes = await fetch(indexUrl);
  console.log(`Fetched ${indexUrl}: status ${indexRes.status}`);
  if (!indexRes.ok) throw new Error(`posts-index.json failed: ${indexRes.status}`);

  const index = await indexRes.json();
  console.log(`Index lists ${index.posts.length} post file(s)`);

  const cutoff = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;
  console.log(`Cutoff: ${new Date(cutoff).toISOString()}`);

  const posts = [];
  for (const filename of index.posts) {
    try {
      const postRes = await fetch(`${SITE_URL}/${filename}`);
      if (!postRes.ok) {
        console.error(`Skipping ${filename}: status ${postRes.status}`);
        continue;
      }
      const post = await postRes.json();
      const pubDate = new Date(post.date).getTime();
      console.log(`Checked ${filename}: date=${post.date} recent=${pubDate >= cutoff}`);
      if (pubDate >= cutoff) {
        posts.push({
          title: post.title,
          excerpt: post.excerpt || post.description || '',
          link: `${SITE_URL}/post.html?post=${encodeURIComponent(filename)}`,
        });
      }
    } catch (err) {
      console.error(`Skipping ${filename}: ${err.message}`);
    }
  }
  return posts;
}

async function getSubscribers() {
  const token = process.env.NETLIFY_API_TOKEN;
  console.log(`NETLIFY_API_TOKEN present: ${Boolean(token)}`);

  const all = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms/${NETLIFY_FORM_ID}/submissions?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(`Netlify API error: ${res.status} ${await res.text()}`);
    }
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
  }

  console.log(`Netlify returned ${all.length} submission(s)`);
  const emails = all
    .map((s) => s.data && s.data.email && s.data.email.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(emails)];
  const valid = unique.filter((e) => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(e));
  const invalid = unique.filter((e) => !valid.includes(e));
  if (invalid.length) console.error('Skipping invalid addresses:', JSON.stringify(invalid));
  return valid;
}

function buildDigestHtml(posts) {
  const postBlocks = posts
    .map(
      (p) => `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 18px; color: #1A1410; margin: 0 0 8px;">${esc(p.title)}</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #3a332c; margin: 0 0 8px;">${esc(p.excerpt)}</p>
          <a href="${p.link}" style="color: #E8590C; font-size: 14px;">Read more &rarr;</a>
        </div>`
    )
    .join('\n');

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; background-color: #FFF8F0; padding: 40px 32px; border-radius: 8px;">
      <img src="${SITE_URL}/logo-orange.png" alt="I Didn't Know I Was Me" style="height: 40px; margin-bottom: 28px;">
      <h1 style="font-size: 20px; color: #1A1410; margin: 0 0 24px;">This week's new posts</h1>
      ${postBlocks}
      <p style="font-size: 13px; color: #7a7268; margin-top: 32px;">
        You're receiving this because you subscribed at ididntknowiwasme.co.za.
      </p>
    </div>
  `;
}

exports.handler = async () => {
  console.log('newsletter-digest invoked at', new Date().toISOString());

  try {
    console.log(`RESEND_API_KEY present: ${Boolean(process.env.RESEND_API_KEY)}`);
    console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL}`);

    const posts = await getRecentPosts();
    console.log(`Found ${posts.length} post(s) from the last ${DAYS_BACK} days`);

    if (posts.length === 0) {
      console.log('No new posts, skipping digest.');
      return { statusCode: 200, body: 'No new posts, digest skipped' };
    }

    let subscribers;
    if (process.env.TEST_EMAIL) {
      subscribers = [process.env.TEST_EMAIL];
      console.log(`TEST MODE: sending only to ${process.env.TEST_EMAIL}`);
    } else {
      subscribers = await getSubscribers();
    }
    console.log(`Subscribers to email: ${subscribers.length}`);

    if (subscribers.length === 0) {
      return { statusCode: 200, body: 'No subscribers, digest skipped' };
    }

    const html = buildDigestHtml(posts);
    const subject =
      posts.length === 1 ? `New post: ${posts[0].title}` : `${posts.length} new posts this week`;

    for (let i = 0; i < subscribers.length; i += 100) {
      const batch = subscribers.slice(i, i + 100);
      const emails = batch.map((email) => ({
        from: `I Didn't Know I Was Me <${process.env.FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
      }));

      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emails),
      });

      const resText = await res.text();
      console.log('Resend batch status:', res.status, '| body:', resText);

      if (!res.ok) {
        console.log('Batch failed, retrying one by one so a single bad address cannot block everyone');
        for (const email of emails) {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(email),
          });
          console.log(`Single send to ${email.to[0]}: status ${r.status}`);
        }
      }
    }

    return { statusCode: 200, body: `Digest sent to ${subscribers.length} subscriber(s)` };
  } catch (err) {
    console.error('DIGEST FAILED:', err.message);
    return { statusCode: 500, body: `Digest failed: ${err.message}` };
  }
};
