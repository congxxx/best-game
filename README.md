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

The optional relay campaign carries one field order into each run. Enter the gold uplink circle to charge it; leaving pauses progress. Completing a link clears hostile shots and restores up to 15 hull. First Light needs one link, Crosswire connects two in sequence, and Heartbreak requires the link and a boss kill. Finish the run to bank each order once for 1, 2, or 3 extra hangar cores. A failed order can be retried next run.

Every 12 kills charge Counterpulse. When the HUD shows **E / REFLECT**, press E to send nearby hostile rounds back along their incoming paths. An empty activation costs nothing. During VOIDHEART's second phase the ring bursts become denser and more frequent; the HUD counts down the final 0.8 seconds before each volley.

Signal League runs alongside survival. Mara Rook flies at a steady speed; Ion Vale accelerates on each leg. Their outlined ships are non-hostile pace pilots. A gate opens every wave: the first, second and third pilots to enter its ring earn 3, 2 and 1 point respectively. A missed gate scores nothing. The live board shows shared places for tied scores. Victory or defeat banks the heat's points into the career standings once; endless play does not reopen the finished heat.

Press T at the zone map to open the tuning tree. Each root costs 3 lifetime salvage cores; each specialization costs another 5 and requires its parent. Research persists across all rigs. A fitted specialization includes its parent's modifiers; changing branches or returning to stock is free. Research does not revoke rig unlocks. The nav radar shows your heading, rival pilot colors, the untagged race gate (square and dotted course), and the current campaign uplink (gold ring), not bullets or enemies.

To reproduce the four submission images, open the game at 1280 × 800 with a fresh profile: use `?shot=boss&seed=27`, `?shot=start&seed=1337`, `?shot=levelup&seed=1337` and `?shot=win&seed=18`, in that order. The cover is captured six simulation steps after the pilot activates the normal counterpulse action during VOIDHEART's second phase.
