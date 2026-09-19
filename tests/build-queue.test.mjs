import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuildQueue } from '../scripts/lib/build-queue.mjs';

test('快速保存合并为串行构建；运行中再次保存不丢失', async () => {
  const gates = [];
  let active = 0;
  let maximum = 0;
  let calls = 0;
  const queue = createBuildQueue(async () => {
    calls++;
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => gates.push(resolve));
    active--;
  });
  const finished = queue();
  await queue();
  await queue();
  await queue();
  gates.shift()();
  await new Promise((resolve) => setImmediate(resolve));
  gates.shift()();
  await finished;
  assert.equal(calls, 2);
  assert.equal(maximum, 1);
});

test('一次构建失败后，修正保存仍然可以成功构建', async () => {
  let calls = 0;
  const errors = [];
  const queue = createBuildQueue(
    async () => {
      if (++calls === 1) throw new Error('invalid content');
    },
    (error) => errors.push(error.message)
  );
  await queue();
  await queue();
  assert.equal(calls, 2);
  assert.deepEqual(errors, ['invalid content']);
});
