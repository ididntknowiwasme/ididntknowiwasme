// This script runs automatically every time Netlify rebuilds the site
// (which happens every time someone publishes a post via the CMS).
// It scans the _posts folder and writes an up-to-date index.json
// listing every post, so the blog page knows what to fetch.

const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', '_posts');
const indexPath = path.join(postsDir, 'index.json');

const files = fs.readdirSync(postsDir)
  .filter(f => f.endsWith('.json') && f !== 'index.json');

const indexData = { posts: files };

fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`Built post index with ${files.length} post(s):`, files);
