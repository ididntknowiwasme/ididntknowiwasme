// This script runs automatically every time Netlify rebuilds the site
// (which happens every time someone publishes a post via the CMS, or
// whenever new files are pushed to GitHub).
//
// It scans for blog post JSON files in two places:
//   1. The site root — files named like "post-something.json" (manually uploaded)
//   2. The _posts/ folder — files the CMS publishes automatically
//
// Then it writes an up-to-date posts-index.json listing every post found,
// so the blog page knows what to fetch and display.

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const postsDir = path.join(rootDir, '_posts');
const indexPath = path.join(rootDir, 'posts-index.json');

let foundPosts = [];

// 1. Root-level posts: files matching post-*.json
const rootFiles = fs.readdirSync(rootDir)
  .filter(f => f.startsWith('post-') && f.endsWith('.json'));
foundPosts = foundPosts.concat(rootFiles);

// 2. CMS-published posts inside _posts/
if (fs.existsSync(postsDir)) {
  const cmsFiles = fs.readdirSync(postsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => '_posts/' + f);
  foundPosts = foundPosts.concat(cmsFiles);
}

const indexData = { posts: foundPosts };

fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

console.log(`Built posts-index.json with ${foundPosts.length} post(s):`, foundPosts);
