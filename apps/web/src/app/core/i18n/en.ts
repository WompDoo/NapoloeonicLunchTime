import type { ApiErrorCode } from '@lunch-campaign/contracts';
import type { OrderRejectionReason, UnitType } from '@lunch-campaign/engine';
import type { Catalogue, Message } from './catalogue';

type Keyed<TPrefix extends string, TId extends string> = Readonly<
  Record<`${TPrefix}.${TId}`, Message>
>;

const ERRORS = {
  'errors.request.invalid':
    'Something in that request was not right. Check the form and try again.',
  'errors.route.notFound': 'That page or action does not exist.',
  'errors.auth.missingToken': 'This device is not signed in to that match.',
  'errors.auth.unknownToken': 'This device is no longer in that match.',
  'errors.auth.wrongMatch': 'This device is signed in to a different match.',
  'errors.match.notFound': 'That match does not exist.',
  'errors.match.notStarted': 'The match has not started yet.',
  'errors.match.finished': 'The match is over.',
  'errors.match.conflict':
    'Someone changed the match at the same moment. Try again.',
  'errors.lobby.unknownTimeZone': 'That time zone is not known.',
  'errors.lobby.unknownInvite': 'This invite link is not valid.',
  'errors.lobby.full': 'Every seat in this match is taken.',
  'errors.lobby.started': 'This match has already started.',
  'errors.lobby.unknownCommander': 'That commander is not available.',
  'errors.lobby.noCommander': 'Pick a commander before you get ready.',
  'errors.day.closed':
    "Today's deadline has passed. The next day opens after tonight's resolution.",
  'errors.zone.unknown': 'That zone is not on the map.',
  'errors.orders.invalid':
    'Some orders cannot be carried out. Fix the ones marked below.',
  'errors.spy.matchFinished': 'The match is over: no more spies.',
  'errors.spy.playerEliminated': 'You are out of the match and cannot spy.',
  'errors.spy.unknownZone': 'That zone is not on the map.',
  'errors.spy.ownZone': 'You cannot spy on your own zone.',
  'errors.spy.spiesUnavailable': 'Spies are unavailable today.',
  'errors.spy.insufficientSupply': 'You do not have enough supply for a spy.',
  'errors.internal': 'Something went wrong on our side. It has been reported.',
} as const satisfies Keyed<'errors', ApiErrorCode>;

const ORDER_PROBLEMS = {
  'orders.problem.playerEliminated': 'You are out of the match.',
  'orders.problem.invalidUnitCount': 'The number of units is not valid.',
  'orders.problem.startingCapitalNotOwned':
    'You can only recruit while you hold your starting capital.',
  'orders.problem.insufficientSupply': 'Not enough supply.',
  'orders.problem.unknownZone': 'That zone is not on the map.',
  'orders.problem.zonesNotAdjacent': 'Those zones are not connected.',
  'orders.problem.beyondMoveRange': 'Those units cannot move that far.',
  'orders.problem.routeBlocked':
    'The route passes through a zone you cannot cross.',
  'orders.problem.insufficientUnits': 'You do not have those units there.',
  'orders.problem.moveOrderLimitReached':
    'You have used all your move orders for today.',
  'orders.problem.unknownUpgrade': 'That upgrade does not exist.',
  'orders.problem.upgradeAlreadyOwned': 'You already own that upgrade.',
  'orders.problem.abilityAlreadyUsed': 'Your ability has already been used.',
  'orders.problem.wrongAbilityTarget':
    "That target does not suit your commander's ability.",
  'orders.problem.zoneNotOwned': 'You do not own that zone.',
} as const satisfies Keyed<'orders.problem', OrderRejectionReason>;

const UNITS = {
  'units.line': { one: '{count} line', other: '{count} line' },
  'units.cavalry': { one: '{count} cavalry', other: '{count} cavalry' },
  'units.skirmishers': {
    one: '{count} skirmisher',
    other: '{count} skirmishers',
  },
  'units.artillery': { one: '{count} gun', other: '{count} guns' },
} as const satisfies Keyed<'units', UnitType>;

const UNIT_NAMES = {
  'unitName.line': 'Line infantry',
  'unitName.cavalry': 'Cavalry',
  'unitName.skirmishers': 'Skirmishers',
  'unitName.artillery': 'Artillery',
} as const satisfies Keyed<'unitName', UnitType>;

const COMMANDERS = {
  'commander.napoleon.name': 'Napoleon',
  'commander.napoleon.passive': 'Artillery bombards one extra unit.',
  'commander.napoleon.abilityName': 'Grand Battery',
  'commander.napoleon.ability': 'All your artillery bombards twice tonight.',
  'commander.wellington.name': 'Wellington',
  'commander.wellington.passive': 'Defender bonus +10%.',
  'commander.wellington.abilityName': 'Reverse Slope',
  'commander.wellington.ability':
    'One zone you own takes no enemy bombardment and its defender bonus doubles tonight.',
  'commander.murat.name': 'Murat',
  'commander.murat.passive':
    'Cavalry may move two zones, through owned or empty zones.',
  'commander.murat.abilityName': 'Grand Charge',
  'commander.murat.ability':
    'Tonight no defender bonus applies where you attack with cavalry.',
  'commander.blucher.name': 'Blücher',
  'commander.blucher.passive': 'Your attacking armies +10% strength.',
  'commander.blucher.abilityName': 'Marschall Vorwärts',
  'commander.blucher.ability':
    'Part of an army that holds joins a battle in an adjacent zone.',
  'commander.kutuzov.name': 'Kutuzov',
  'commander.kutuzov.passive': 'Orderly Retreat is always active.',
  'commander.kutuzov.abilityName': 'Scorched Earth',
  'commander.kutuzov.ability':
    'One zone you own produces nothing tonight and tomorrow.',
  'commander.moore.name': 'Sir John Moore',
  'commander.moore.passive':
    'Your skirmishers appear as unidentified in spy reports.',
  'commander.moore.abilityName': 'Ambush',
  'commander.moore.ability':
    'Tonight your skirmishers deal double damage to cavalry and take normal damage from it.',
} as const;

const UPGRADES = {
  'upgrade.orderly-retreat.name': 'Orderly Retreat',
  'upgrade.orderly-retreat.description':
    'When your army loses, one unit of each type survives and retreats.',
  'upgrade.bayonet-drill.name': 'Bayonet Drill',
  'upgrade.bayonet-drill.description':
    'Your line infantry takes normal damage from skirmishers.',
  'upgrade.lancers.name': 'Lancers',
  'upgrade.lancers.description':
    'Your cavalry takes normal damage from line infantry.',
} as const;

const EVENTS = {
  'event.mud.name': 'Mud',
  'event.mud.description':
    'Cavalry loses its counter bonus; artillery cannot move.',
  'event.fog.name': 'Fog',
  'event.fog.description':
    'No spies, and other armies show no unit counts today.',
  'event.typhus.name': 'Typhus',
  'event.typhus.description':
    "Each player's largest army loses a fifth of its units tonight.",
  'event.levee-en-masse.name': 'Levée en masse',
  'event.levee-en-masse.description':
    'Everyone gets free line infantry at their capital.',
  'event.armistice.name': 'Armistice',
  'event.armistice.description':
    'No combat or bombardment; moves into others’ zones bounce back.',
} as const;

const HONOURS = {
  'honour.grande-armee.name': 'Grande Armée',
  'honour.grande-armee.description': 'Most units after Friday',
  'honour.empire.name': 'Empire',
  'honour.empire.description': 'Most zones owned after Friday',
  'honour.butchers-bill.name': "Butcher's Bill",
  'honour.butchers-bill.description': 'Most enemy units destroyed',
  'honour.iron-discipline.name': 'Iron Discipline',
  'honour.iron-discipline.description':
    'Fewest own units lost, with at least one battle fought',
  'honour.the-fox.name': 'The Fox',
  'honour.the-fox.description': 'Most battles won while outnumbered',
  'honour.last-stand.name': 'Last Stand',
  'honour.last-stand.description': 'Most battles won as defender',
  'honour.spymaster.name': 'Spymaster',
  'honour.spymaster.description': 'Most spy reports',
  'honour.thunder-of-guns.name': 'Thunder of Guns',
  'honour.thunder-of-guns.description':
    'Most units removed by your bombardment',
  'honour.saddle-up.name': 'Saddle Up',
  'honour.saddle-up.description':
    'Most battles won with cavalry as your largest arm',
  'honour.rearguard.name': 'Rearguard',
  'honour.rearguard.description': 'Most units saved by Orderly Retreat',
  'honour.forager.name': 'Forager',
  'honour.forager.description': 'Most supply produced',
  'honour.blitz.name': 'Blitz',
  'honour.blitz.description': 'Most zones captured in one night',
} as const;

export const EN = {
  'app.name': 'Lunch Campaign',
  'app.tagline': 'A Napoleonic week, fifteen minutes a day.',
  'app.skipToContent': 'Skip to content',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.close': 'Close',
  'common.copy': 'Copy',
  'common.copied': 'Copied',
  'common.copyFailed': 'Could not copy. Select the link and copy it yourself.',
  'common.youName': '{name} (you)',
  'common.supply': { one: '{count} supply', other: '{count} supply' },
  'common.points': { one: '{count} point', other: '{count} points' },
  'common.units': { one: '{count} unit', other: '{count} units' },
  'common.noUnits': 'no units',
  'errors.network':
    'Cannot reach the server. Check your connection and try again.',
  'state.error': 'This could not be loaded.',

  'home.title': 'Your campaigns',
  'home.empty':
    'No matches on this device yet. Start one, or open an invite link a friend sent you.',
  'home.create.title': 'Start a match',
  'home.create.intro':
    'Two to four players, five weekdays. Orders close at 23:00 and every night resolves at 02:00.',
  'home.create.timeZone': 'Time zone for deadlines',
  'home.create.submit': 'Create the lobby',
  'home.match.as': 'as {name}',
  'home.match.open': 'Open',

  'join.title': 'Join the campaign',
  'join.intro': 'Pick a name the others will know you by.',
  'join.name': 'Your name',
  'join.submit': 'Join',

  'match.notOnDevice':
    'This device is not in that match. Open your invite link again to join.',
  'match.backHome': 'Back to your campaigns',
  'match.tab.map': 'Map',
  'match.tab.orders': 'Orders',
  'match.tab.night': 'Last night',
  'match.tab.honours': 'Honours',
  'match.tabs': 'Match sections',

  'lobby.title': 'Lobby',
  'lobby.invite': 'Invite link',
  'lobby.inviteHint':
    'Send this to the others. Anyone with it can join until the match starts.',
  'lobby.members': { one: '{count} player', other: '{count} players' },
  'lobby.seats': '{min} to {max} players',
  'lobby.picked': 'Commander picked',
  'lobby.notPicked': 'No commander yet',
  'lobby.ready': 'Ready',
  'lobby.notReady': 'Not ready',
  'lobby.pickTitle': 'Your commander',
  'lobby.pickHint':
    'Picks stay secret until everyone is ready. Duplicates are allowed.',
  'lobby.passive': 'Always',
  'lobby.ability': 'Once per match',
  'lobby.getReady': "I'm ready",
  'lobby.unready': 'Not ready yet',
  'lobby.startRule':
    'The match starts when everyone is ready. Day 1 is today if it is a weekday before 23:00.',
  'lobby.leave': 'Leave the lobby',

  'day.title': 'Day {number}: {label}',
  'day.deadline': 'Orders close {time}',
  'day.closed': 'Orders are closed. The night resolves at {time}.',
  'day.finished': 'The campaign is over.',
  'day.supply': 'Your supply',
  'day.event': 'In play today',
  'day.noEvent': 'No event today',
  'day.spies': 'Spies',
  'day.spyCost': 'A spy costs {cost} supply',
  'day.noSpies': 'No spies today',

  'map.title': 'Campaign map',
  'map.instructions':
    'Use the arrow keys to move between zones and Enter to select one.',
  'map.listToggle': 'Show as a list',
  'map.listCaption': 'Zones, their owners and armies',
  'map.column.zone': 'Zone',
  'map.column.kind': 'Kind',
  'map.column.owner': 'Owner',
  'map.column.army': 'Army',
  'map.kind.capital': 'Capital',
  'map.kind.city': 'City',
  'map.kind.plain': 'Plain',
  'map.neutral': 'Neutral',
  'map.hidden': 'Hidden by fog',
  'map.zoneLabel': '{zone}, {kind}, {owner}, {army}',

  'zone.title': 'Zone {zone}',
  'zone.none': 'Select a zone on the map to see what you know about it.',
  'zone.spy': 'Send a spy ({cost} supply)',
  'zone.planMove': 'Plan a move from here',
  'zone.spyReported':
    'You have today’s report on this zone. It stays true until tonight.',
  'zone.spyClosed': 'Spies open again with the next day.',
  'zone.spyTooExpensive': 'A spy costs {cost} supply, more than you have.',
  'zone.reportToday': 'Today’s spy report',

  'orders.title': "Today's orders",
  'orders.empty': 'No orders yet. Units without orders hold.',
  'orders.saved': 'Saved. You can change them until the deadline.',
  'orders.unsaved': 'Not saved yet',
  'orders.submit': 'Save orders',
  'orders.remove': 'Remove',
  'orders.moveLimit': '{used} of {max} moves',
  'orders.add': 'Add an order',
  'orders.kind': 'Order',
  'orders.kind.move': 'Move',
  'orders.kind.recruit': 'Recruit',
  'orders.kind.support': 'Support with artillery',
  'orders.kind.buyUpgrade': 'Buy an upgrade',
  'orders.kind.useAbility': 'Use your ability',
  'orders.from': 'From',
  'orders.to': 'To',
  'orders.via': 'Through',
  'orders.target': 'Target',
  'orders.count': 'How many',
  'orders.unitType': 'Unit type',
  'orders.upgrade': 'Upgrade',
  'orders.addToList': 'Add',
  'orders.describe.move': 'Move {units} from {from} to {to}',
  'orders.describe.moveVia': 'Move {units} from {from} through {via} to {to}',
  'orders.describe.recruit': 'Recruit {units}',
  'orders.describe.support': '{count} artillery in {from} support {target}',
  'orders.describe.buyUpgrade': 'Buy {upgrade}',
  'orders.describe.ability': 'Use {ability}',
  'orders.describe.abilityZone': 'Use {ability} on {zone}',
  'orders.describe.abilityReinforce':
    'Use {ability}: send {units} from {from} to {to}',
  'orders.closed': 'Orders are closed for today.',
  'orders.supplyLeft': {
    one: '{count} supply left after these orders',
    other: '{count} supply left after these orders',
  },
  'orders.overBudget':
    'These orders cost more supply than you have. Some will be refused.',
  'orders.direct': 'Directly',
  'orders.choose': 'Choose…',
  'orders.units': 'Units',
  'orders.available': { one: '{count} here', other: '{count} here' },
  'orders.cost': { one: 'Costs {count} supply', other: 'Costs {count} supply' },
  'orders.recruitWhere':
    'New units join your army at your starting capital tonight.',
  'orders.supportHint':
    'The guns hold and bombard a battle of yours in the next zone.',
  'orders.noMovable': 'None of your zones has units to move.',
  'orders.noArtillery': 'None of your zones has artillery.',
  'orders.noUpgrades':
    'You own every upgrade, or have the rest in today’s orders.',
  'orders.abilityUsed': 'You have used your ability.',
  'orders.abilityPlanned': 'Your ability is already in today’s orders.',

  'preview.title': 'What you know about this fight',
  'preview.loading': 'Working it out…',
  'preview.reinforcement': 'A reinforcement: your own zone, no battle.',
  'preview.unopposed': 'No army there now. Others may still move in tonight.',
  'preview.countHidden': 'Fog hides how many units are there.',
  'preview.countOnly': {
    one: '{count} unit defends. Spy on it for an estimate.',
    other: '{count} units defend. Spy on it for an estimate.',
  },
  'preview.estimate': 'Estimate from today’s spy report',
  'preview.yourStrength': 'Your strength',
  'preview.theirStrength': 'Defender’s strength',
  'preview.likelyYou': 'You would likely win',
  'preview.likelyDefender': 'The defender would likely hold',
  'preview.unidentified': {
    one: '{count} unidentified unit is left out.',
    other: '{count} unidentified units are left out.',
  },
  'preview.caveat':
    'Not a promise: tonight’s abilities, bombardment and other moves can change it.',
  'preview.beats': '{unit} beat {targets}',
  'preview.beatenBy': '{unit} fear {threats}',

  'spies.title': 'Spy reports today',
  'spies.empty':
    'No spies sent today. Select an enemy zone on the map to send one.',
  'spies.report': '{zone} ({owner}): {units}',
  'spies.unidentified': {
    one: '{count} unidentified',
    other: '{count} unidentified',
  },

  'replay.title': 'Last night',
  'replay.empty': 'No night has been resolved yet.',
  'replay.previous': 'Previous',
  'replay.next': 'Next',
  'replay.step': 'Event {current} of {total}',
  'replay.all': 'Show every event',
  'replay.wins': '{player} wins',
  'replay.bothDestroyed': 'both sides destroyed',
  'replay.battleAt': 'Battle at {zone}: {outcome}',
  'replay.fieldBattle': 'Clash between {from} and {to}: {outcome}',
  'replay.side': '{player} ({role}): {before} → {after}',
  'replay.sideStrength':
    '{player} ({role}): {before} → {after}, strength {strength}',
  'replay.role.attacker': 'attacking',
  'replay.role.defender': 'defending',
  'replay.formed': 'Battle forms at {zone}: {sides}',
  'replay.formedSide': '{player} {role} with {units}',
  'replay.recruited': '{player} recruited {units} at {zone}',
  'replay.granted': '{player} received {units} at {zone}',
  'replay.moved': '{player} moved {units}: {route}',
  'replay.bounced': "{player}'s move {route} bounced back ({units})",
  'replay.reinforced': '{player} sent {units} to join the battle: {route}',
  'replay.retreated': '{player} retreated {units}: {route}',
  'replay.retreatBlocked':
    "{player}'s {units} at {zone} had nowhere to retreat",
  'replay.lostToEvent': '{player} lost {units} at {zone}',
  'replay.rejected': 'Your order {number} was not carried out: {reason}',
  'replay.upgrade': '{player} bought {upgrade}',
  'replay.ability': '{player} used {ability}',
  'replay.abilityZone': '{player} used {ability} on {zone}',
  'replay.abilityReinforce':
    '{player} used {ability}, sending {units}: {route}',
  'replay.abilityNoEffect': "{player}'s ability had no effect",
  'replay.bombardment':
    "{player}'s {guns} in {from} bombarded {target}: {hits}",
  'replay.noHits': 'no hits',
  'replay.hit': '{player} lost {units}',
  'replay.decidedByGuns':
    'The battle at {zone} ended under bombardment: {survivor} left standing',
  'replay.nobody': 'nobody',
  'replay.captured': '{player} captured {zone}',
  'replay.capturedFrom': '{player} captured {zone} from {previous}',
  'replay.produced': '{player} produced {supply}',
  'replay.scored': '{player} scored {points} for {cities}',
  'replay.cities': { one: '{count} city', other: '{count} cities' },
  'replay.eliminated': '{player} was eliminated',
  'replay.expired': '{name} wore off',
  'replay.someEffect': 'An effect',
  'replay.announced': 'Announced: {event} comes into play on day {day}',

  'honours.title': 'Honours this week',
  'honours.empty': 'No honours are in play.',
  'honours.points': { one: '{count} point', other: '{count} points' },
  'honours.nobody': 'Nobody would earn it yet',
  'honours.leading': '{players} leading',
  'honours.notEligible': 'not eligible',

  'players.title': 'Commanders',
  'players.seat': 'Seat {seat}',
  'players.abilityUsed': 'Ability used',
  'players.abilityReady': 'Ability ready',
  'players.eliminated': 'Eliminated',

  'final.title': 'Final score',
  'final.winner': '{players} wins the campaign',
  'final.shared': 'Shared victory: {players}',
  'final.rank': 'Rank',
  'final.player': 'Commander',
  'final.total': 'Total',
  'final.cities': 'Cities',
  'final.honours': 'Honours',
  'final.awarded': 'Awarded to {players}',
  'final.unawarded': 'Not awarded',

  ...ERRORS,
  ...ORDER_PROBLEMS,
  ...UNITS,
  ...UNIT_NAMES,
  ...COMMANDERS,
  ...UPGRADES,
  ...EVENTS,
  ...HONOURS,
} as const satisfies Catalogue;

export type TranslationKey = keyof typeof EN;
