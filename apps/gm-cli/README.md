# GM CLI

Runs a Lunch Campaign match from JSON files, so a game master can playtest the rules over a real week before
the API and web client exist. The GM holds the match file and sees everything; players only ever see what
`gm view` prints for them.

```sh
yarn -s gm help
```

`yarn -s` keeps yarn's own lines out of the output, so `yarn -s gm view … > napoleon.txt` gives you exactly the
player's view. The script builds the CLI first (cached after the first run).

## A GM's week

```sh
# Monday morning: seats follow the order given
yarn -s gm new week.json our-week napoleon-player:napoleon wellington-player:wellington kutuzov-player:kutuzov murat-player:murat

# Every day
yarn -s gm view week.json napoleon-player > napoleon.txt   # send each player their view
yarn -s gm spy week.json kutuzov-player A1                 # when a player asks: charges them, prints their report
yarn -s gm resolve week.json monday.json                   # at the deadline, with everyone's orders

# After Friday night
yarn -s gm score week.json
```

Commanders: `napoleon`, `wellington`, `murat`, `blucher`, `kutuzov`, `moore`.

## Orders file

One file per night: each player's orders, one string per order, in the order the player gave them. Players
with no entry give no orders.

```json
{
  "napoleon-player": ["move A1 -> A2 2L 2C", "recruit 1 line"],
  "murat-player": ["move D4 -> C4 -> C3 2C", "ability"]
}
```

| Order   | Example                                                                                     |
| ------- | ------------------------------------------------------------------------------------------- |
| Recruit | `recruit 2 line` (`line`, `cavalry`, `skirmishers`, `artillery`)                            |
| Move    | `move A1 -> B2 2L 1C`; Murat's cavalry may pass through a zone: `move D4 -> C4 -> C3 2C`    |
| Support | `support A2 -> B2 1` (artillery in A2 bombards a battle in B2)                              |
| Upgrade | `upgrade squares`                                                                           |
| Ability | `ability` (no target), `ability B2` (an owned zone), `ability A2 -> B2 2L` (reinforcements) |

Units are a count and a letter: `L` line, `C` cavalry, `S` skirmishers, `A` artillery.

The CLI only checks the notation. Whether an order is legal is the engine's call at resolution: an illegal
order is rejected and logged like in a real match, and `gm resolve` lists the rejections for the GM.

## The example week

[`playtest/scripted-week`](playtest/scripted-week) holds the five nights of the hand-checked Milestone 3 week
(seed `lunch-week-2`). Spies from the test script: Monday Kutuzov → A1; Tuesday Kutuzov → D4; Wednesday
Kutuzov → C3 and Napoleon → B3; Thursday Kutuzov → B2; Friday Napoleon → B3 and Kutuzov → C3. Murat wins on
the tie-break with 24 points. A test plays this week through the CLI and checks it ends exactly where the
library scenario does.

## Match file

`{ "version": 1, "state": …, "replayLog": […], "spyLog": […] }`, written by the CLI after every command. Only
the envelope is checked when reading it back; a hand-edited state the engine cannot use fails at the next
command with the engine's own error. `gm new` never replaces an existing file.
