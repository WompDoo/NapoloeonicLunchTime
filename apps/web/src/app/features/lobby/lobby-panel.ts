import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import type {
  LobbyDto,
  LobbyMemberDto,
  MatchDto,
} from '@lunch-campaign/contracts';
import { map } from 'rxjs';
import { createAction } from '../../core/api/action';
import { InlineErrors } from '../../core/api/inline-errors';
import { LunchApi } from '../../core/api/lunch-api';
import { ClipboardWriter } from '../../core/clipboard/clipboard-writer';
import { TranslatePipe } from '../../core/i18n/translate-pipe';
import { PlayerSessions } from '../../core/sessions/player-sessions';
import {
  commanderAbility,
  commanderAbilityName,
  commanderName,
  commanderPassive,
} from '../../shared/content-keys';
import { errorKeyOf } from '../../shared/error-key';
import type { Observable } from 'rxjs';

/** The invite link others open to join: the join page of this app, for this lobby's code. */
export function inviteLinkOf(origin: string, inviteCode: string): string {
  return `${origin}/join/${encodeURIComponent(inviteCode)}`;
}

function isMember(playerId: string): (member: LobbyMemberDto) => boolean {
  return (member): boolean => member.playerId === playerId;
}

@Component({
  selector: 'lc-lobby-panel',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lobby-panel.html',
  styleUrl: './lobby-panel.scss',
})
export class LobbyPanel {
  private readonly api = inject(LunchApi);
  private readonly clipboard = inject(ClipboardWriter);
  private readonly origin = inject(DOCUMENT).location.origin;
  private readonly router = inject(Router);
  private readonly sessions = inject(PlayerSessions);
  protected readonly lobbyError = inject(InlineErrors).for('lobby');
  protected readonly errorKeyOf = errorKeyOf;
  protected readonly commanderName = commanderName;
  protected readonly commanderPassive = commanderPassive;
  protected readonly commanderAbility = commanderAbility;
  protected readonly commanderAbilityName = commanderAbilityName;

  public readonly lobby = input.required<LobbyDto>();
  public readonly changed = output<MatchDto>();

  protected readonly inviteLink = computed((): string =>
    inviteLinkOf(this.origin, this.lobby().inviteCode),
  );
  protected readonly amReady = computed((): boolean =>
    this.lobby().members.some(
      (member): boolean =>
        isMember(this.lobby().yourPlayerId)(member) && member.ready,
    ),
  );
  protected readonly copied = signal(false);

  protected readonly pick = createAction(
    (commanderId: string): Observable<MatchDto> =>
      this.api.pickCommander(this.lobby().matchId, { commanderId }),
  );
  protected readonly ready = createAction(
    (ready: boolean): Observable<MatchDto> =>
      this.api.setReady(this.lobby().matchId, { ready }),
  );
  protected readonly leave = createAction(
    (matchId: string): Observable<string> =>
      this.api.leave(matchId).pipe(map((): string => matchId)),
  );

  protected isYou(member: LobbyMemberDto): boolean {
    return isMember(this.lobby().yourPlayerId)(member);
  }

  protected async copyInvite(): Promise<void> {
    this.copied.set(await this.clipboard.copy(this.inviteLink()));
  }

  protected async choose(commanderId: string): Promise<void> {
    this.show(await this.pick.run(commanderId));
  }

  protected async toggleReady(): Promise<void> {
    this.show(await this.ready.run(!this.amReady()));
  }

  protected async leaveLobby(): Promise<void> {
    const leftMatchId = await this.leave.run(this.lobby().matchId);
    await this.goHomeAfterLeaving(leftMatchId);
  }

  private show(match: MatchDto | null): void {
    if (match !== null) {
      this.changed.emit(match);
    }
  }

  private async goHomeAfterLeaving(leftMatchId: string | null): Promise<void> {
    if (leftMatchId !== null) {
      this.sessions.forget(leftMatchId);
      await this.router.navigate(['/']);
    }
  }
}
