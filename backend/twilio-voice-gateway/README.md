# Twilio Inbound Voice Gateway

This service is a separate, future-ready ingress for Twilio Programmable Voice:

```text
Twilio DID +18312988954
  -> signed Voice webhook / TwiML
  -> bidirectional Media Streams (mu-law 8 kHz)
  -> this gateway (verify signature + convert audio)
  -> IAP-protected voice adapter (PCM 16 kHz)
  -> Vertex AI Live
```

It does not configure Twilio, create a phone number, or modify the deployed PBX or voice adapter. The inbound number must be owned by the Twilio account and Voice-enabled before use. This selected design bypasses PBX SIP ingress; legacy Asterisk/AudioSocket resources are outside the selected two-channel call path.

## Planned browser WebRTC channel

The second planned customer entry point is `https://711shopping.com/chatandshop`. It should use the Twilio Voice JavaScript SDK in the browser, request a short-lived access token from a backend endpoint, call a TwiML Application, and use a separate signed Voice URL such as `/twilio/webrtc/voice`. That webhook should return the same bidirectional Media Stream flow and converge on this gateway/voice adapter.

The repository does **not** yet implement the browser SDK, token endpoint, TwiML Application route, WebRTC identity policy, or browser call lifecycle. The URL was not reachable during the latest review, so DNS, HTTPS certificate, and deployed route must be verified before wiring the call button. Never put the Twilio Auth Token, API secret, Google credentials, or Vertex credentials in browser code. Do not connect browser audio directly to the adapter or label ordinary WebSocket audio as WebRTC.

## Required configuration

See `.env.example`. In production, inject `TWILIO_AUTH_TOKEN` and `TWILIO_STREAM_TOKEN_SECRET` from Secret Manager; do not commit a populated env file. Set `TWILIO_PUBLIC_BASE_URL` to the exact public HTTPS service URL used in Twilio's Voice webhook. The service deliberately does not trust incoming `Host` or `X-Forwarded-Host` when validating signatures.

`VOICE_ADAPTER_URL` is the IAP-protected Cloud Run adapter URL. Grant the gateway's dedicated service account the IAP HTTPS Resource Accessor role (`roles/iap.httpsResourceAccessor`) for the protected resource. The gateway obtains short-lived Google OAuth access tokens through Application Default Credentials with the `openid` and `userinfo.email` scopes, which IAP accepts for service-account authentication; no service-account key file is required.

## Local checks

```powershell
npm install --prefix backend\twilio-voice-gateway
npm test --prefix backend\twilio-voice-gateway
```

For local development, supply environment variables without committing secrets and run:

```powershell
npm start --prefix backend\twilio-voice-gateway
```

## Twilio Console setup (future deployment)

1. Verify that `+18312988954` is active, voice-enabled, and owned by the intended account.
2. Deploy this service as a public HTTPS Cloud Run service because Twilio must reach the webhook and WebSocket. Keep application-level Twilio signature validation mandatory on both endpoints. Inject secrets with Secret Manager and attach a dedicated least-privilege service account authorized for the IAP-protected AI adapter.
3. Configure the number's Voice webhook as `https://<service>/twilio/voice` with HTTP POST.
4. Configure Cloud Run request timeout to cover the intended call duration (up to the platform-supported maximum), enable WebSockets, and set min/max instances and concurrency based on load tests and budget. Verify Twilio's call duration and region limits independently.
5. Test using a controlled call. Inspect Twilio Call Logs, gateway redacted logs, adapter logs, and audio quality. Do not enable recordings until retention, consent/notice, access controls, and privacy obligations are approved.

## Security and operational boundaries

- The webhook validates `X-Twilio-Signature` with the Twilio Node SDK against a configured canonical public URL and rejects any number other than the configured DID.
- The Media Stream upgrade also validates the signature against the canonical `wss://` URL. A short-lived, call-bound HMAC token passed through TwiML binds the WebSocket start event to the validated call.
- Calls to the IAP-protected adapter use short-lived Google OAuth access tokens with the `openid` and `userinfo.email` scopes, authenticated as the gateway's attached service account.
- Only the stream token, call SID, and audio are exchanged with the gateway/adapter; the NT DID is not involved.
- Audio is converted between Twilio `audio/x-mulaw` 8 kHz and the existing AI adapter's signed linear PCM 16 kHz. DTMF is detected but not routed to the AI adapter in this first release.
- Recording is not performed by this gateway. The post-stream TwiML provides a short failure announcement and hangup if the media stream ends unexpectedly.
- Apply Cloud Run quotas, alerting, rate protection, least-privilege IAM, secret rotation, and call-cost limits before a pilot.

This project is not deployed and has not passed a real Twilio call. Passing unit tests proves protocol helpers and webhook behavior, not carrier provisioning, Twilio signature interoperability for Media Stream upgrades, network reachability, Vertex response quality, or end-to-end availability.

## Live deployment preparation (2026-11-03)

The target project is `gen-lang-client-0845508747` in `asia-southeast1`. A dedicated runtime service account, `twilio-voice-gateway@gen-lang-client-0845508747.iam.gserviceaccount.com`, has been created and granted only IAP access to `fahsai-audio-bridge` plus accessor access to the two gateway secrets. `TWILIO_STREAM_TOKEN_SECRET` has a generated secret version. `TWILIO_AUTH_TOKEN` exists in Secret Manager but has no version yet; the current Twilio Auth Token must be added there before deployment.

The Twilio number is active, but currently routes Voice POST requests to the existing `https://allday-telesale.cloudfunctions.net/twilio-inbound-voice` handler. That setting has not been changed. Keep it as the rollback target until a deployed gateway passes a signed webhook test, a real media-stream connection, and a supervised inbound call. The number also shows Emergency Address as not registered; avoid emergency-calling tests.
