import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)],
    ),
  );
  return nested.flat();
}
test('Angular source contains neither Resend credentials nor direct Resend calls', async () => {
  for (const path of await files('src')) {
    if (!/\.(ts|js|html|json)$/.test(path)) continue;
    const source = await readFile(path, 'utf8');
    // Report the file only, never any matching credential or source content.
    assert.equal(
      /RESEND_API_KEY|api\.resend\.com|\bre_[A-Za-z0-9_-]{20,}\b/.test(source),
      false,
      `Email boundary violation in ${path}`,
    );
  }
});
