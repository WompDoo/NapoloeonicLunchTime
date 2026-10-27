import { Body, Controller, Param, Post } from '@nestjs/common';
import type { PlayerJoined } from '@lunch-campaign/contracts';
import { decodeJoinMatchRequest } from '@lunch-campaign/contracts';
import { MatchesService } from '../matches/matches.service';

/** The invite link: anyone holding the code joins the lobby and gets their player token. */
@Controller('invites')
export class InvitesController {
  public constructor(private readonly matches: MatchesService) {}

  @Post(':inviteCode/players')
  public join(
    @Param('inviteCode') inviteCode: string,
    @Body() body: unknown,
  ): PlayerJoined {
    return this.matches.join(inviteCode, decodeJoinMatchRequest(body));
  }
}
