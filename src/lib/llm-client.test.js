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
