import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const loadModule = async () => {
  const source = await readFile(new URL('./llm-client.ts', import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
  return import(dataUrl);
};

test('buildUserPrompt uses persona object identity and not persona_name feature key', async () => {
  const { buildUserPrompt } = await loadModule();
  const set = {
    id: 's1',
    options: [
      { id: 'f1', name: 'Feature 1', description: 'Desc 1' },
      { id: 'f2', name: 'Feature 2', description: 'Desc 2' },
      { id: 'f3', name: 'Feature 3', description: 'Desc 3' },
      { id: 'f4', name: 'Feature 4', description: 'Desc 4' },
    ],
  };

  const prompt = buildUserPrompt(
    set,
    { brand: 'Ford', name: 'Transit' },
    new Map([['persona_name', 'Wrong Persona Name']]),
    { id: 'fleet-manager', name: 'Fleet Manager' }
  );

  assert.match(prompt, /Fleet Manager/);
  assert.doesNotMatch(prompt, /Wrong Persona Name/);
});

test('rankOptions fails on repeated non-JSON outputs instead of random fallback', async () => {
  const { LLMClient } = await loadModule();
  const set = {
    id: 'set-1',
    options: [
      { id: 'f1', name: 'Feature 1' },
      { id: 'f2', name: 'Feature 2' },
      { id: 'f3', name: 'Feature 3' },
      { id: 'f4', name: 'Feature 4' },
    ],
  };
  const persona = {
    id: 'persona-1',
    name: 'Fleet Manager',
    demographics: { age: '35-44', income: '$120k', family: '2 kids', location: 'US' },
    attributes: {},
    motivations: ['Uptime'],
    painPoints: ['Downtime'],
    buyingBehavior: ['Data-driven'],
  };

  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  let calls = 0;
  try {
    console.warn = () => {};
    globalThis.fetch = async () => {
      calls++;
      return {
        ok: true,
        json: async () => ({ output_text: 'best: f1, worst: f4' }),
        status: 200,
        statusText: 'OK',
      };
    };

    const client = new LLMClient({ model: 'gpt-4.1-mini-2025-04-14', maxRetries: 3, temperature: 0 });
    await assert.rejects(
      () => client.rankOptions(set, persona, { brand: 'Ford', name: 'Transit' }, new Map()),
      /Failed to rank options after 3 attempts/
    );
    assert.equal(calls, 3);
  } finally {
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }
});
