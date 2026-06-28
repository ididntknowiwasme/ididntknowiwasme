const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const postsDir = path.join(rootDir, '_posts');
const indexPath = path.join(rootDir, 'posts-index.json');

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
