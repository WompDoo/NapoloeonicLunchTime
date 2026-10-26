import type { PlayerId, SpyReport } from '@lunch-campaign/player-view';
import { unitParts } from './text';

const EMPTY_ZONE = 'no units';

/** "Spy report on B3, held by p2: 3L, 2 unidentified". */
export function renderSpyReport(report: SpyReport): string {
  return `Spy report on ${report.zoneId}, ${ownerText(report.ownerId)}: ${contentsText(report)}`;
}

function ownerText(ownerId: PlayerId | null): string {
  return ownerId === null ? 'neutral' : `held by ${ownerId}`;
}

function contentsText(report: SpyReport): string {
  const parts = [...identifiedParts(report), ...unidentifiedParts(report)];
  return parts.length === 0 ? EMPTY_ZONE : parts.join(', ');
}

function identifiedParts(report: SpyReport): readonly string[] {
  const parts = unitParts(report.units);
  return parts.length === 0 ? [] : [parts.join(' ')];
}

function unidentifiedParts(report: SpyReport): readonly string[] {
  return report.unidentified === 0
    ? []
    : [`${report.unidentified} unidentified`];
}
