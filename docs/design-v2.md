# Lunch Campaign v2: design draft

Status: **draft for review.** Once agreed, this replaces the zone-based rules in `docs/spec.md`.

Every rule carries a tag:

- **Agreed**: decided in discussion.
- **Proposal**: my suggestion, for you to accept, change or strike.
- **Default**: a tuning number. It lives in `libs/content` and changes with play, not with code.

## 1. Pillars

- One week, one turn per night, 5 to 10 minutes of decisions a day.
- Few decisions a day, each one costly: the movement pool, two city actions and a tech.
- You see the size of other armies but not what they are made of. Spies, decoys and rumours trade in that
  difference.
- Trust you can break, at a public price.
- Something to talk about at lunch: the morning gazette.
- Played on the map, on a phone.

## 2. The match

- **Agreed:** 2 to 8 players. One week of five nights; days and nights follow v1's calendar: the match starts
  when everyone is ready, orders close at 23:00, nights resolve at 02:00 and weekends are skipped.
- **Agreed:** most points after Friday night wins (see 12).
- **Proposal:** v1's tie-breaks stay: more towns held at the end, then fewer units lost in battle. Players tied on
  both share the victory.

## 3. The map

- **Agreed:** a hex grid. Straight-line distance and moves agree closely on hexes.
- **Agreed:** with three or more players, every player is the same straight-line distance from at least two
  others. Capitals sit on a circle around the centre at equal angles. With two players, they face each other
  across the centre.
- **Agreed:** capitals are one ring in from the map's edge, so everyone has some ground behind them.
- **Agreed:** terrain can make routes unequal. That is expected.
- **Default:** neighbouring capitals are 6 hexes apart, so armies marching straight at each other meet on night 2.
- **Agreed:** a new map is generated for every match from its seed; the same seed always gives the same map.
- **Proposal:** constraints on the generator:
  - every hex can be reached;
  - no impassable terrain next to a capital;
  - towns keep a minimum distance from each other and from capitals.

### Terrain

| Terrain  | Where    | Movement               | Battle (proposal)                                                       |
| -------- | -------- | ---------------------- | ----------------------------------------------------------------------- |
| Plain    | hex      | 2                      | none                                                                    |
| Road     | hex      | 1                      | none                                                                    |
| Forest   | hex      | 3                      | cavalry weaker; skirmishers stronger                                    |
| Hills    | hex      | 3                      | defender bonus up; cavalry weaker; artillery on the hill stronger       |
| Marsh    | hex      | 4                      | cavalry and artillery weaker                                            |
| River    | hex edge | +2 to cross            | attacking across it: attacker weaker; artillery firing over it stronger |
| Bridge   | hex edge | crossing costs nothing | none                                                                    |
| Lake     | hex      | impassable             | none                                                                    |
| Mountain | hex      | impassable             | none                                                                    |

**Default:** the movement costs above, in march points.

### Towns and territory

- **Agreed:** neutral towns produce a fixed bundle of resources for whoever holds them. Nothing else.
- **Default:** about one and a half towns per player.
- **Proposal:** your territory is every hex within 2 of your capital and within 1 of each town you hold, plus
  every hex one of your armies ends the night in. Where two players' territory overlaps, the hex goes to the
  nearer holder; on a tie it stays neutral.
- **Agreed:** the map draws borders where territories meet: the lines of control.

## 4. Resources

- **Proposal (recommended):** one currency, gold. It pays for buildings, hiring and intrigue.
  - Why not horses and iron as well: a player with no horse town nearby could not field cavalry, and the counter
    triangle would break for them. One number to count also keeps the day short.
- **Proposal:** every town is a kind. Holding it gives gold and a discount, never units:
  - **market town:** more gold;
  - **stud farm:** cavalry costs 1 gold less to hire;
  - **ironworks:** artillery costs 1 gold less to hire.
- **Default:** income per night: capital 8 gold, market town 4 gold, stud farm and ironworks 2 gold each.
- **Default:** starting stock: 12 gold.

## 5. The day

You have until 23:00 to give orders. All of them resolve at night.

### Movement

- **Agreed:** one daily movement pool, shared by all your armies.
- **Default:** the pool is 24 march points.
- **Proposal:** each army also has a speed limit per night, the speed of its slowest unit type.
  - **Default** speeds, in march points: line and skirmishers 6, cavalry 8, artillery 4.
- **Proposal:** you draw each army's path hex by hex. The path's cost comes out of the pool.
- **Proposal:** an army can leave units behind as a new army. Your armies that end the night in the same hex
  merge.

### City actions

- **Agreed:** two city actions a day. Each is either:
  - **build** one building, or
  - **muster:** hire from every unit building at once, paying per unit.
- **Proposal:** a muster may hire fewer units than are available. A second muster on the same day hires nothing
  more.
- **Agreed:** hiring costs resources.

### Research

- **Agreed:** pick one tech a day, two once you have a university.
- **Agreed:** a tech is learned at the start of tonight's resolution, so it already counts in tonight's battles.

### Intrigue

Paid in gold.

- **Proposal:** a spy is available from the start. It reveals what one army or hex is made of, for the day.
- **Proposal:** decoys, rumours and sabotage come from the intrigue techs (see 10).

### Diplomacy

Free. See 8.

## 6. The night, in order

1. **Pacts:** pacts broken today take effect.
2. **Research:** today's techs are learned.
3. **Buildings:** buildings ordered today are finished.
4. **Musters:** recruits appear (see 11). They do not move tonight.
5. **Movement:** armies move in steps, one hex per army per step, all at the same time, until every army has used
   its path.
   - Armies meet when they enter the same hex on the same step, or swap hexes head-on.
   - Armies whose paths cross on different steps do not meet.
   - Armies of players with a pact pass through each other.
   - Enemies who meet fight at once (see 7).
6. **Sharing a hex:** armies of two players with a pact that end in the same hex: the stronger one holds it, and
   the weaker stops one hex short along its path.
7. **Captures:** an army alone at the end of the night in an enemy or neutral town, or in an enemy capital, takes
   it.
8. **Production:** income from the capital and held towns. Unit buildings add their nightly growth to the
   hiring pool.
9. **Scoring:** see 12.
10. **Pacts:** tonight's pacts end and their cooldown starts.
11. **Gazette:** the morning gazette is written (see 13).

## 7. Battles

- **Agreed:** v1's strength model stays, with the counter triangle (line beats cavalry, cavalry beats skirmishers,
  skirmishers beat line), softened and shaped by terrain.
  - **Default:** a counter adds 50% strength, down from double in v1.
  - **Default:** terrain modifiers as in the terrain table.
  - **Default:** defender bonus 25%. Hills and walls add more.
- **Agreed:** the result depends on the strength and make-up of the armies; the loser does not always retreat.
- **Agreed:** the result depends on R, the stronger side's strength divided by the weaker side's:

| Result         | Default threshold | Losses                                          | Afterwards                                       |
| -------------- | ----------------- | ----------------------------------------------- | ------------------------------------------------ |
| **Indecisive** | R below 1.25      | both sides lose about the same                  | both halt in the hex each held before that step  |
| **Victory**    | R from 1.25 to 2  | the loser more, the winner fewer                | the loser retreats one hex; the winner continues |
| **Rout**       | R of 2 or more    | the loser is destroyed; the winner loses little | the winner continues                             |

- **Agreed:** the retreat hex is on no enemy army's remaining path.
  - **Proposal:** it is the hex nearest the loser's own territory, ties broken by the seed. With no such hex, the
    loser surrenders and is destroyed.
- **Agreed:** the winner keeps going with whatever movement it has left. It can meet another army and fight again
  the same night.
  - **Proposal:** a battle costs the winner one step of movement.
- **Proposal:** the units in each army shape the losses:
  - cavalry on the winning side pursues, so the loser loses more;
  - cavalry or skirmishers on the losing side cover the retreat, so it loses less;
  - Orderly Retreat turns a rout into a retreat.
- **Proposal:** a battle between three or more armies works as in v1.

## 8. Pacts

- **Agreed:** a pact between two players covers one night: it is agreed during the day and holds for that night.
- **Agreed:** while the pact holds, the two players' armies pass through each other. When both end in the same hex,
  the stronger army holds it.
- **Agreed:** pacts have a cooldown, so nobody can stay safe all week.
  - **Default:** after a pact, the same two players wait one day before they can agree another.
- **Agreed:** a pact can be broken. The break takes effect that same night, everyone is told at dawn, and the
  breaker loses points.
  - **Default:** breaking a pact costs 5 points.
- **Proposal:** a player can send gold to another during the day, for example as the price of a pact.

## 9. The city

- **Agreed:** one city per player: the capital.
- **Agreed:** unit buildings produce units, as in Heroes of Might and Magic.
  - **Default:** each unit building adds a nightly growth to the hiring pool: barracks 3 line, stables 2 cavalry,
    skirmisher camp 2 skirmishers, foundry 1 gun. Units nobody hires stay in the pool.

| Building        | Does                                      | Default cost  |
| --------------- | ----------------------------------------- | ------------- |
| Barracks        | line infantry growth (built at the start) | already built |
| Stables         | cavalry growth                            | 6 gold        |
| Skirmisher camp | skirmisher growth                         | 6 gold        |
| Foundry         | artillery growth                          | 8 gold        |
| Market          | +3 gold a night                           | 5 gold        |
| Walls           | defender bonus in the capital up          | 8 gold        |
| University      | one more tech a night                     | 10 gold       |
| Spy network     | intrigue costs less                       | 6 gold        |

- **Proposal:** techs unlock more buildings (see 10). Each building can be built once.
- **Default:** what a unit costs to hire: line 2 gold, skirmisher 2 gold, cavalry 3 gold, artillery 4 gold.

## 10. Tech

- **Agreed:** 8 techs. Without a university you learn 5 of them in a week. With a university from night 1 you can
  learn all 8.
- **Proposal:** three branches. Each tech unlocks a building, a unit improvement or an action:

| Branch   | Tech            | Gives                                                   |
| -------- | --------------- | ------------------------------------------------------- |
| Military | Bayonet Drill   | line infantry takes normal damage from skirmishers (v1) |
| Military | Lancers         | cavalry takes normal damage from line infantry (v1)     |
| Military | Orderly Retreat | a rout becomes a retreat (v1, reworked)                 |
| Economy  | Trade           | towns give 50% more                                     |
| Economy  | Conscription    | unit buildings grow 1 more a night                      |
| Economy  | Engineering     | crossing rivers costs 1; build Pontoon Depot (bridges)  |
| Intrigue | Agents          | decoys and rumours                                      |
| Intrigue | Saboteurs       | sabotage: a capital or town produces half tomorrow      |

- **Proposal:** who has learned what is public, like upgrades in v1.

## 11. Reinforcing the front

**Agreed:** mustered units join any of your armies standing in territory
connected to your capital by an unbroken run of your own hexes. Without a connected army, they appear in the
capital.

This gives the lines of control a rule. Cut through someone's territory and you cut off their reinforcements.
Hiring on Thursday still matters.

Generals (your commander on the map, leading one army) are set aside for after the milestones below.

## 12. Scoring

- **Agreed:** points for towns held at the end of Wednesday and Friday nights.
  - **Default:** 3 points a town on Wednesday, 6 on Friday, as for cities in v1.
- **Agreed:** a large bonus for taking an enemy capital.
  - **Default:** 10 points, once per capital.
- **Agreed:** honours, as in v1.
  - **Proposal:** keep the v1 honours that still make sense and add new ones, for example most pacts kept, or a
    betrayal that paid off.
- **Agreed:** minus pact penalties.
- **Agreed:** a player who loses their capital loses their city actions and research until they retake it. They
  are out of the match only once they have neither a capital nor an army.

## 13. The gazette

- **Proposal:** every morning, a short Napoleonic newspaper reports what everyone could see overnight: battle
  results, captures, broken pacts and the coming event.
- **Proposal:** a player who knows Agents can pay to plant a rumour in it. Rumours look exactly like real reports.
  - **Default:** a rumour costs 3 gold.

## 14. What you can see

- **Agreed:** no fog of war. Everyone sees the whole map: terrain, towns, territory, and where every army is.
- **Agreed:** other players' armies show their size, not what they are made of. A spy report or a battle shows
  what they are made of.
- **Proposal:** a decoy shows a made-up size until it is spied on or fought.
- **Proposal:** the Fog event (see 17) hides other armies' sizes for one day: one blind day in a game where you
  otherwise see everything.

## 15. The UI

- **Agreed:** the map looks like a map: terrain, rivers, lakes and the lines of control.
- **Agreed:** an army appears as one soldier figure per unit type, each with its number. Someone else's army is one
  neutral figure with its total; on a Fog day, the figure shows a "?".
- **Proposal:** the map is how you give orders.
  - Tap an army and the hexes it can reach light up; tap one to draw the path, and see the matchup preview
    inline.
  - Paths show as arrows on the map.
  - A bottom sheet holds the city, research, intrigue and diplomacy.
  - The replay animates on the map.
  - The map pans and zooms.

## 16. Commanders

- **Agreed:** keep them. You pick one in the lobby, picks stay secret until the match starts, and two players
  may pick the same one. Each has a passive and an ability used once a match. They play the part of Civ's
  leaders: each leans on a different part of the game, not only on combat.
- **Proposal:** two new commanders, so eight players can all pick a different one.

| Commander        | Leans on    | Passive                                   | Once a match                                                                            |
| ---------------- | ----------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Napoleon         | artillery   | artillery 25% stronger                    | **Grand Battery:** tonight your artillery counts double                                 |
| Wellington       | defence     | defender bonus +10%                       | **Reverse Slope:** one army takes no artillery damage and its defender bonus doubles    |
| Murat            | cavalry     | cavalry speed +2 march points             | **Grand Charge:** tonight no defender bonus where your cavalry attacks                  |
| Blücher          | attack      | attacking armies 10% stronger             | **Marschall Vorwärts:** +12 march points tonight                                        |
| Kutuzov          | attrition   | Orderly Retreat always                    | **Scorched Earth:** towns taken from you tonight give their captor nothing for 2 nights |
| Sir John Moore   | skirmishers | skirmishers show as unidentified to spies | **Ambush:** tonight your skirmishers in forest deal double damage                       |
| Talleyrand (new) | diplomacy   | breaking a pact costs half                | **Turncoat:** break one pact with no penalty; only the betrayed player is told          |
| Fouché (new)     | intrigue    | spies cost half                           | **Secret Police:** tonight you see what every army is made of                           |

- **Default:** every number in the table.

## 17. Events

- **Agreed:** keep them. One event per match, drawn from the seed, announced in Tuesday's gazette and in play
  on Wednesday, as in v1. Announcing it a day ahead makes it something to plan for, not luck, and it gives the
  gazette a headline.

| Event          | Wednesday (proposal)                                      |
| -------------- | --------------------------------------------------------- |
| Mud            | every hex costs 1 more march point; artillery cannot move |
| Fog            | other armies' sizes are hidden; no spies                  |
| Typhus         | each player's largest army loses a fifth of its units     |
| Levée en masse | free line infantry join every capital                     |
| Armistice      | no battles tonight: armies that meet an enemy halt        |

## 18. What carries over from v1

**Stays:**

- the deterministic engine and the seeded random draws;
- modifiers and effective parameters, where terrain becomes a zone-scoped modifier;
- the strength model and how casualties are removed;
- `filterForPlayer` and the leak tests;
- the replay log and honour queries;
- the API, its scheduler and the calendar;
- the web foundation: translations, error handling, sessions.

**Rewritten:** the map (hexes, terrain, territory), orders (paths and city actions instead of an order list), how a
night resolves (stepped movement, battle results), the economy, research, pacts, the gazette and the map-first UI.

## 19. Milestones

**Agreed.** Each milestone ends with something you can play in the browser, so we can see whether it is fun
before we build the next one. Every milestone keeps v1's standards: 100% coverage, determinism tests, the leak tests.

| Milestone | Builds                                                                                                                                                                  | You can                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| M7        | the seeded hex map generator for 2 to 8 players; drawing the map: terrain, rivers, towns, borders, pan and zoom                                                         | create a match and look at its map  |
| M8        | armies: paths, the movement pool, stepped movement, battle results, retreats, captures, town scoring; ordering on the map; unit figures; the replay animated on the map | play a week of pure war             |
| M9        | the city: resources, buildings, musters, reinforcing through connected territory                                                                                        | build an economy that feeds the war |
| M10       | tech, the university, spies, decoys, sabotage, the gazette and rumours                                                                                                  | out-think the others                |
| M11       | pacts, cooldowns, the betrayal penalty, trades                                                                                                                          | make deals and break them           |
| M12       | commanders, events, v2 honours, a balancing pass                                                                                                                        | play the full game                  |

## 20. Open questions

1. **Resources** (4): one currency, gold, with town kinds that give discounts?
2. **The remaining proposals:** everything still tagged Proposal. Accept as written, or strike what you disagree
   with. Defaults are numbers we tune in play.
