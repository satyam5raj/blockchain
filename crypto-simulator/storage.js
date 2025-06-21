import { writeFileSync, existsSync, readFileSync } from 'fs';
const path = './chain-data.json';

function saveChain(chain) {
  writeFileSync(path, JSON.stringify(chain, null, 2));
}

function loadChain() {
  if (existsSync(path)) {
    const raw = readFileSync(path);
    return JSON.parse(raw);
  }
  return null;
}

export default { saveChain, loadChain };
