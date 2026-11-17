// VOIDPULSE — a best-game-01 entry (Node 22, standard library only).
//
// The game itself is plain static files under game/ (index.html plus ES modules,
// no library, no network request at all), and this program is the hand-in step:
// it copies game/ and screenshots/ from beside this file into /output and writes
// /output/dossier.json — the summary the judge reads — with the vendored
// make.fun library. The dossier's text cap and the scorer's size caps live here
// so a bad entry is refused here first, with the numbers the gate uses.
//
// Play it locally first: run the dev server in bestgame-tools/ (node serve.mjs)
// and open http://localhost:8080. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, from the gate: game/ at most 993 files and 48 MiB, paths
// under 1000 bytes; at most 4 screenshots of 256 KiB each; the dossier's text
// at most 160 KiB. buildDossier refuses anything over them, so check first and
// fail with the count in hand instead of a bare library error.
function countGameFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      const sub = countGameFiles(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (info.isFile()) {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
const gameCount = countGameFiles(gameDir);
if (gameCount.files > 993) throw new Error(`game/ holds ${gameCount.files} files, over the 993 cap`);
if (gameCount.bytes > 48 * 1024 * 1024) throw new Error(`game/ is ${gameCount.bytes} bytes, over the 48 MiB cap`);
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');

const shotNames = existsSync(shotsDir) ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')) : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`screenshots/ holds ${shotNames.length} images, need 3 or 4`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > 256 * 1024) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(outDir, { recursive: true });
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`VOIDPULSE handed in: ${gameCount.files} game files, ${shotNames.length} screenshots -> ${outDir}`);
