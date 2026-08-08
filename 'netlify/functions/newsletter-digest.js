// netlify/functions/newsletter-digest.js
//
// Runs on a weekly schedule (see netlify.toml). Checks posts-index.json for
// posts published in the last 7 days, and if there are any, emails a digest
// to every newsletter subscriber (pulled live from Netlify Forms).
//
// No email is sent if there were no new posts that week — avoids empty digests.
//
// Setup:
// 1. In Netlify: Site configuration -> Environment variables -> add
//      NETLIFY_API_TOKEN = <a Personal Access Token>
//      (User settings -> Applications -> New access token, in the Netlify dashboard)
//    This is separate from RESEND_API_KEY and FROM_EMAIL, which this function reuses.
// 2. Deploy. Netlify reads the schedule from netlify.toml automatically.
// 3. To test without waiting for the schedule: Functions -> newsletter-digest -> "Run now"

const SITE_URL = 'https://www.ididntknowiwasme.co.za';
const NETLIFY_SITE_ID = '72147931-f604-42b4-9b24-b95f32df8dfd';
const NETLIFY_FORM_ID = '6a7526074934f20008121a5d';
const DAYS_BACK = 7;

async function getRecentPosts() {
  const indexRes = await fetch(`${SITE_URL}/posts-index.json`);
  const index = await indexRes.json();
  const cutoff = Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000;

  const posts = [];
  for (const filename of index.posts) {
    try {
      const postRes = await fetch(`${SITE_URL}/${filename}`);
      const post = await postRes.json();
      const pubDate = new Date(post.date).getTime();
      if (pubDate >= cutoff) {
        posts.push({
          title: post.title,
          excerpt: post.excerpt,
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
  const res = await fetch(
    `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/forms/${NETLIFY_FORM_ID}/submissions`,
    { headers: { Authorization: `Bearer ${process.env.NETLIFY_API_TOKEN}` } }
  );
  if (!res.ok) {
    throw new Error(`Netlify API error: ${res.status} ${await res.text()}`);
  }
  const submissions = await res.json();
  const emails = submissions
    .map((s) => s.data && s.data.email)
    .filter(Boolean);
  return [...new Set(emails)]; // dedupe
}

function buildDigestHtml(posts) {
  const postBlocks = posts
    .map(
      (p) => `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 18px; color: #1A1410; margin: 0 0 8px;">${p.title}</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #3a332c; margin: 0 0 8px;">${p.excerpt}</p>
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

exports.handler = async (event) => {
  console.log('newsletter-digest invoked. next_run:', JSON.parse(event.body || '{}').next_run);

  const posts = await getRecentPosts();
  console.log(`Found ${posts.length} post(s) from the last ${DAYS_BACK} days`);

  if (posts.length === 0) {
    console.log('No new posts this week — skipping digest.');
    return { statusCode: 200, body: 'No new posts, digest skipped' };
  }

  const subscribers = await getSubscribers();
  console.log(`Sending digest to ${subscribers.length} subscriber(s)`);

  if (subscribers.length === 0) {
    return { statusCode: 200, body: 'No subscribers, digest skipped' };
  }

  const html = buildDigestHtml(posts);
  const subject =
    posts.length === 1 ? `New post: ${posts[0].title}` : `${posts.length} new posts this week`;

  // Resend batch endpoint: up to 100 emails per call.
  const batches = [];
  for (let i = 0; i < subscribers.length; i += 100) {
    batches.push(subscribers.slice(i, i + 100));
  }

  for (const batch of batches) {
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
    console.log('Resend batch response status:', res.status, '| body:', resText);
  }

  return { statusCode: 200, body: `Digest sent to ${subscribers.length} subscriber(s)` };
};
