const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const postsDir = path.join(rootDir, '_posts');
const indexPath = path.join(rootDir, 'posts-index.json');
const rssPath = path.join(rootDir, 'rss.xml');

const SITE_URL = 'https://www.ididntknowiwasme.co.za';
const SITE_TITLE = "I Didn't Know I Was Me";
const SITE_DESCRIPTION = 'Stories, devotionals, and reflections on faith, identity, and purpose in Christ.';

let foundPosts = [];

const rootFiles = fs.readdirSync(rootDir)
  .filter(f => f.startsWith('post-') && f.endsWith('.json'));
foundPosts = foundPosts.concat(rootFiles);

if (fs.existsSync(postsDir)) {
  const cmsFiles = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => '_posts/' + f);
  foundPosts = foundPosts.concat(cmsFiles);
}

const indexData = { posts: foundPosts };

fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`Built posts-index.json with ${foundPosts.length} post(s):`, foundPosts);

// --- Build rss.xml so email tools (Buttondown, Mailchimp, etc.) can
// auto-notify subscribers whenever a new post is published. ---

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const postEntries = foundPosts
  .map(filename => {
    try {
      const raw = fs.readFileSync(path.join(rootDir, filename), 'utf8');
      const data = JSON.parse(raw);
      const pubDate = new Date(data.date);
      return {
        filename,
        title: (data.title || '').trim(),
        excerpt: data.excerpt || '',
        author: data.author || '',
        date: isNaN(pubDate) ? new Date(0) : pubDate,
        link: `${SITE_URL}/post.html?post=${encodeURIComponent(filename)}`,
      };
    } catch (err) {
      console.warn(`Skipping ${filename} in RSS feed (parse error): ${err.message}`);
      return null;
    }
  })
  .filter(Boolean)
  .sort((a, b) => b.date - a.date); // newest first

const rssItems = postEntries
  .map(p => `
  <item>
    <title>${escapeXml(p.title)}</title>
    <link>${escapeXml(p.link)}</link>
    <guid isPermaLink="true">${escapeXml(p.link)}</guid>
    <pubDate>${p.date.toUTCString()}</pubDate>
    ${p.author ? `<author>${escapeXml(p.author)}</author>` : ''}
    <description>${escapeXml(p.excerpt)}</description>
  </item>`)
  .join('\n');

const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${escapeXml(SITE_TITLE)}</title>
  <link>${SITE_URL}/blog.html</link>
  <description>${escapeXml(SITE_DESCRIPTION)}</description>
  <language>en</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems}
</channel>
</rss>
`;

fs.writeFileSync(rssPath, rssFeed);

console.log(`Built rss.xml with ${postEntries.length} item(s).`);
