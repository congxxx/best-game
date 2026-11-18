# best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/congxxx/best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/congxxx/best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

VOIDPULSE — a neon arena survivor. Hold the arena, survive the waves, and break the VOIDHEART boss on wave 10. Entry for the [best-game-01](https://make.fun/bounty/best-game-01) bounty on make.fun.

## Run it

```sh
python3 -m http.server 8000 --directory game
```

Then open http://localhost:8000 in desktop Chrome. No build step, no network: vanilla JS canvas, all art drawn in code, all sound synthesized with WebAudio.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rkfbtynm&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play

- WASD / arrows — move; mouse — aim (auto-fire is always on)
- Collect XP gems, pick 1 of 3 upgrades on level-up, dodge the pink shots
- P / Esc — pause; R — restart; 1 / 2 / 3 — pick a card
- 5 enemy types plus gold elites every 3rd wave; wave-10 boss VOIDHEART, then endless mode
- Each wave's sector changes your ship: Cyan Drift extends pickup range by 30%, Ember Reef boosts firing rate by 15%, and Violet Deep boosts movement speed by 12%. These effects switch with the sector and stack with your upgrade choices.
- After defeat or victory, press Z for the zone map and choose an unlocked starting sector.

To reproduce the four submission images, open the game at 1280 × 800 with a fresh profile: use `?shot=start&seed=1337`, `?shot=play&seed=1337`, `?shot=levelup&seed=1337` and `?shot=win&seed=9`, in that order.
