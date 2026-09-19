import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/deploy-server.sh', import.meta.url));
const supported = process.platform === 'linux';

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'resume-deploy-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  const repo = path.join(root, 'repo');
  const site = path.join(root, 'site');
  await mkdir(bin);
  await mkdir(repo);
  await mkdir(path.join(site, 'old/assets'), { recursive: true });
  await writeFile(path.join(site, 'old/index.html'), 'old');
  await writeFile(path.join(site, 'old/assets/old.css'), 'old-css');
  await symlink(path.join(site, 'old'), path.join(site, 'current'));
  // Stub external Git/npm/browser operations; exercise the real publishing shell.
  await writeFile(path.join(bin, 'git'), `#!/bin/bash
shift 2
case "$1" in
  status) printf '%s' "\${TEST_DIRTY:-}" ;;
  branch) echo main ;;
  rev-parse) echo abc123 ;;
  archive) tar -cf - --files-from /dev/null ;;
esac
`, { mode: 0o755 });
  await writeFile(path.join(bin, 'npm'), `#!/bin/bash
echo "$*" >> "$TEST_CALLS"
if [[ "$*" == 'run build' ]]; then
  [[ "\${TEST_FAIL:-}" != build ]] || exit 1
  mkdir -p dist/assets
  echo new > dist/index.html
  echo new-css > dist/assets/new.css
fi
`, { mode: 0o755 });
  await writeFile(path.join(bin, 'node'), `#!/bin/bash
[[ "\${TEST_FAIL:-}" != manifest ]]
`, { mode: 0o755 });
  const calls = path.join(root, 'calls');
  const run = (extra = {}) => spawnSync('/bin/bash', [script], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RESUME_REPO: repo,
      RESUME_SITE: site, TEST_CALLS: calls, ...extra },
  });
  return { site, calls, run };
}

test('服务器发布：成功切换、保留旧资源，同一提交不重复 build', { skip: !supported }, async (t) => {
  const { site, calls, run } = await fixture(t);
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal((await readFile(path.join(site, 'current/index.html'), 'utf8')).trim(), 'new');
  assert.equal(await readFile(path.join(site, 'current/assets/old.css'), 'utf8'), 'old-css');
  assert.equal((await readFile(path.join(site, 'current/.release-sha'), 'utf8')).trim(), 'abc123');
  const before = await readFile(calls, 'utf8');
  assert.equal(run().status, 0);
  assert.equal(await readFile(calls, 'utf8'), before);
});

for (const failure of ['build', 'manifest']) {
  test(`服务器发布：${failure} 失败不覆盖线上，下一次仍会重试`, { skip: !supported }, async (t) => {
    const { site, run } = await fixture(t);
    assert.notEqual(run({ TEST_FAIL: failure }).status, 0);
    assert.equal(await readFile(path.join(site, 'current/index.html'), 'utf8'), 'old');
    assert.equal(run().status, 0);
    assert.equal((await readFile(path.join(site, 'current/index.html'), 'utf8')).trim(), 'new');
  });
}

test('服务器发布：脏工作区不拉取或发布', { skip: !supported }, async (t) => {
  const { site, run } = await fixture(t);
  assert.notEqual(run({ TEST_DIRTY: ' M source.html' }).status, 0);
  assert.equal(await readFile(path.join(site, 'current/index.html'), 'utf8'), 'old');
});
