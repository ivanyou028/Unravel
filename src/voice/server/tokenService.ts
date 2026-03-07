import { RtcTokenBuilder, RtcRole } from 'agora-token';

const AGORA_APP_ID = process.env.AGORA_APP_ID!;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const TOKEN_EXPIRATION_SECONDS = 3600;

export function generateToken(channelName: string, uid: number): string {
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + TOKEN_EXPIRATION_SECONDS;

  return RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    RtcRole.PUBLISHER,
    TOKEN_EXPIRATION_SECONDS,
    privilegeExpiredTs,
  );
}
