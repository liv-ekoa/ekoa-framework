// The preview branch runs on fictional data. If it is ever merged into main by mistake, this
// stops Cloudflare's build so ekoa-framework.org keeps serving the last real version.
const branch = process.env.WORKERS_CI_BRANCH || process.env.CF_PAGES_BRANCH || '';
if (branch === 'main') {
  console.error('\nThis is the preview build (fictional data). It must not be deployed from main.');
  console.error('Undo the merge of the preview branch into main, then push again.\n');
  process.exit(1);
}
console.log(`Preview build${branch ? ` for branch "${branch}"` : ''}: fictional data only.`);
