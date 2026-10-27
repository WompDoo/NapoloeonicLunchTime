import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PublicPlayerView } from '@lunch-campaign/contracts';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { commanderName, upgradeName } from '../../shared/content-keys';
import type { Roster } from '../../shared/roster';

/** Every commander in seat order: what everyone knows about them. */
@Component({
  selector: 'lc-players-list',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="lc-panel" aria-labelledby="players-title">
      <div class="grid gap-3 p-4">
        <h2 id="players-title" class="board__title">
          {{ 'players.title' | t }}
        </h2>
        <ul class="grid gap-2">
          @for (player of players(); track player.playerId) {
            <li
              class="player"
              [style.border-left-color]="roster().colourOf(player.playerId)"
            >
              <div class="flex flex-wrap items-baseline justify-between gap-2">
                <span class="player__name">
                  {{ 'players.seat' | t: { seat: player.seat } }} ·
                  {{ roster().nameOf(player.playerId) }} ·
                  {{ commanderName(player.commanderId) | t }}
                </span>
                <span class="player__score">{{
                  'common.points' | t: { count: player.score }
                }}</span>
              </div>
              <p class="player__facts">
                {{
                  (player.abilityUsed
                    ? 'players.abilityUsed'
                    : 'players.abilityReady'
                  ) | t
                }}
                @if (player.eliminated) {
                  · <strong>{{ 'players.eliminated' | t }}</strong>
                }
                @for (upgradeId of player.upgrades; track upgradeId) {
                  · {{ upgradeName(upgradeId) | t }}
                }
              </p>
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .board__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.125rem;
    }
    .player {
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--line);
      border-left-width: 6px;
      border-radius: var(--radius);
    }
    .player__name {
      font-weight: 600;
    }
    .player__score {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
    }
    .player__facts {
      margin: 0.25rem 0 0;
      color: var(--muted);
      font-size: 0.875rem;
    }
  `,
})
export class PlayersList {
  public readonly players = input.required<readonly PublicPlayerView[]>();
  public readonly roster = input.required<Roster>();
  protected readonly commanderName = commanderName;
  protected readonly upgradeName = upgradeName;
}
