// Local validation only: run Angular directly, never the production sitemap generator.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '..');
const protectedFiles = ['public/sitemap.xml', 'public/_redirects'];
const before = protectedFiles.map(file => readFileSync(resolve(root, file)));
const hook = resolve(__dirname, 'offline-catalog-fetch.cjs').replaceAll('\\', '/');
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/@angular/cli/bin/ng.js'), 'build'], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, NODE_OPTIONS: `--require="${hook}"`, NG_CLI_ANALYTICS: 'false' }
});
for (const [index, file] of protectedFiles.entries()) {
  assert.deepEqual(readFileSync(resolve(root, file)), before[index], `${file} must remain unchanged`);
}
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
