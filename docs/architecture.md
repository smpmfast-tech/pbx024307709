# AI Voice Agent Telesales Inbound — Two-Channel Architecture

**Review date:** 2026-11-03 (ICT)
**Selected channels:** Telephone (Twilio PSTN) and browser calling (WebRTC through Twilio Voice SDK), with the browser entry URL `https://711shopping.com/chatandshop`.
**Status:** Architecture and implementation plan only. The new Twilio gateway is not deployed; WebRTC calling and order capture are not implemented. The supplied URL could not be fetched in this review because of a DNS/connection/TLS transport failure, so its publication and availability are unverified. No live routing, cloud resource, or provider setting was changed by this design.

## Executive decision

The AI Telesales Inbound service will accept calls through two customer entry channels:

1. **Telephone:** Customer dials the Twilio number `+1 831 298 8954`.
2. **WebRTC:** Customer visits the secure website and explicitly starts an in-browser call using the Twilio Voice JavaScript SDK.

Both entry channels use Twilio for call signaling/media and converge on the same Twilio Voice Gateway, IAP-protected voice adapter, Vertex AI Live session contract, order service, Google Sheets synchronization, and post-call SMS workflow. The channel identity and consent evidence remain attached to each session so reporting and policy can distinguish them.

The browser must **not** connect directly to Vertex AI, the internal voice adapter, or Google Cloud using long-lived credentials. The selected architecture does not use NT/T30, an Asterisk SIP trunk, or a customer-supplied SIP endpoint.

## Verified current state and gaps

| Component | Current state | Work still required |
|---|---|---|
| Twilio PSTN number | `+18312988954` was observed active and Voice-enabled. Its Voice webhook still points to the existing Cloud Functions handler. | Keep that webhook until the replacement passes the release gates; `TWILIO_AUTH_TOKEN` Secret Manager secret has no version, so the new gateway cannot yet be deployed. |
| Twilio Voice Gateway | Source exists at [`backend/twilio-voice-gateway`](../backend/twilio-voice-gateway/README.md). Local tests cover signature checks, TwiML, and media conversion. | Deploy, validate public HTTPS/WSS, verify Twilio signatures against production canonical URLs, and run supervised phone calls. |
| Voice adapter | IAP-protected Cloud Run WebSocket adapter reaches Vertex AI Live. A no-phone-call smoke test returned generated audio. | Real carrier audio, two-way quality, long-call behavior, scaling, and production health checks are not yet proven. |
| WebRTC channel | No Twilio Voice JS SDK device/call client, token endpoint, TwiML Application route, or browser call-completion handling was found in the repository. | Implement the browser channel, secure access-token issuance, TwiML App voice URL, consent UX, and separate end-to-end tests. |
| WebRTC destination | User-designated browser entry URL is `https://711shopping.com/chatandshop`. | DNS/connection/TLS fetch failed during this review; confirm DNS, HTTPS certificate, route deployment, and application ownership before publishing a call control. |
| Order capture / Sheets / SMS | Architecture only. The voice model and gateway do not yet create confirmed structured orders or send SMS. | Implement a shared order contract, durable order/outbox service, Sheets worker, SMS worker, delivery callbacks, and consent/opt-out handling. |
| Production acceptance | No supervised inbound call through the new gateway has passed. | Complete channel-specific and shared release checks below. |

These are findings from the repository and previously inspected configuration; the dashboard is not a live health monitor.

## System topology

```text
CHANNEL A — TELEPHONE
Customer mobile / landline
  -> PSTN
  -> Twilio DID +1 831 298 8954
  -> signed HTTPS Voice webhook (/twilio/voice)
  -> TwiML <Connect><Stream>
  -> bidirectional Twilio Media Stream (WSS, μ-law 8 kHz)
                                      \
                                       \
                                        v
                               Twilio Voice Gateway
                               - validate signatures
                               - bind call/session/channel
                               - audio conversion + limits
                                        |
                                        | short-lived identity + IAP
                                        v
                               Cloud Run Voice Adapter
                                        |
                                        v
                               Vertex AI Live session
                                        |
                         shared order/session service
                           |                     |
                     Google Sheets sync     post-call SMS

CHANNEL B — BROWSER WEBRTC
Customer browser at https://711shopping.com/chatandshop
  -> explicit call action + microphone permission
  -> authenticated/short-lived token API
  -> Twilio Voice JavaScript SDK (WebRTC media)
  -> Twilio Programmable Voice
  -> signed TwiML Application Voice URL (/twilio/webrtc/voice)
  -> TwiML <Connect><Stream>
  -> same Twilio Voice Gateway and shared AI/order services above
```

### Why use Twilio Voice SDK for browser WebRTC

The repository's voice adapter accepts audio over a server-side WebSocket and forwards audio to Vertex AI Live; it is not a browser WebRTC signaling/media endpoint. Cloud Run/IAP WebSockets do not by themselves provide ICE negotiation, STUN/TURN traversal, DTLS-SRTP termination, or a WebRTC media relay.

Using the **Twilio Voice JavaScript SDK** gives the browser a supported WebRTC calling edge. Twilio terminates browser WebRTC media and converts it into the same Programmable Voice call/media-stream flow used by the PSTN channel. This avoids operating a separate SFU/TURN/media gateway and keeps AI, business logic, and order recording shared. It also means WebRTC calls consume Twilio Voice resources and must be checked against account, region, browser, and destination policies.

Do not label a browser-to-WebSocket PCM prototype as WebRTC. If a future requirement demands browser media to bypass Twilio, that is a separate architecture needing a managed WebRTC/SFU gateway, STUN/TURN, ICE, DTLS-SRTP, media conversion, abuse controls, and independent capacity/latency testing.

## Channel flows

### A. Telephone inbound

1. Customer calls `+1 831 298 8954`; Twilio sends the signed Voice webhook to `/twilio/voice`.
2. Gateway validates `X-Twilio-Signature`, the configured canonical HTTPS URL, expected `To` DID, and required fields. It returns TwiML that starts a bidirectional stream to the gateway's WSS endpoint.
3. The stream handshake signature and short-lived call-bound HMAC token are verified. Gateway opens an authenticated IAP WebSocket to the voice adapter.
4. Gateway normalizes μ-law 8 kHz audio to the adapter's expected PCM 16 kHz format and converts AI audio back to Twilio media frames. It enforces payload limits, queue bounds, timeouts, and call lifecycle.
5. On call end, signed Twilio status callbacks finalize the session and trigger eligible post-call work. Until the new service passes supervised tests, keep the current webhook unchanged as rollback.

### B. Browser WebRTC inbound

1. Customer opens the site over HTTPS, sees a clear call/privacy notice, and explicitly presses **Call AI Agent**. Only then request microphone permission and start the Twilio Voice SDK device.
2. Browser requests a short-lived Twilio Voice access token from the application API. The API authenticates/rate-limits the session and signs the token using server-side Twilio API Key credentials from Secret Manager. The browser never receives the Twilio Auth Token, API secret, Google credentials, or Vertex access token.
3. Browser uses the Twilio Voice SDK to call the configured TwiML Application. The TwiML Application Voice URL is a separate signed webhook route, `/twilio/webrtc/voice`, that validates the browser/client identity and allowed call parameters and returns the same bidirectional stream TwiML.
4. Twilio handles WebRTC signaling and media traversal. The browser never connects directly to the gateway's raw media endpoint or Cloud Run adapter.
5. Twilio streams the call to the same gateway. The gateway tags the session `source_channel=webrtc`, associates the Twilio Call SID and a server-generated session ID, and forwards audio to the same AI adapter.
6. Browser receives call state through the Voice SDK. The server remains authoritative for call completion and order/SMS eligibility; a browser `disconnect` event alone is not proof of completed call processing.
7. For a WebRTC order, caller ID may be absent or may be a Twilio Client identity rather than a PSTN phone number. Ask for and verify a mobile number only when needed, obtain explicit SMS consent, and never assume the browser identity is an SMS destination.

The destination URL is a deployment/routing requirement, not proof the page exists. Before adding the SDK button, publish and verify `https://711shopping.com/chatandshop` with a valid HTTPS certificate, route ownership, privacy notice, and a rollback path. Do not redirect or change the current root site as a substitute.

### Shared session contract

The gateway should normalize both entry points into a common session record:

| Field | Rule |
|---|---|
| `session_id` | Server-generated unique ID; correlation key across voice, order, and operations. |
| `provider_call_sid` | Twilio Call SID; validated and unique for provider callbacks. |
| `source_channel` | Enum `pstn` or `webrtc`; set by the trusted webhook route, never accepted as authoritative from browser-supplied data. |
| `caller_identity` | PSTN number if provided by Twilio; otherwise authenticated/ephemeral browser identity. Treat as untrusted until policy validation. |
| `started_at`, `ended_at` | Server/provider timestamps; keep canonical UTC timestamps in the backend. |
| `consent` | Structured notice/consent events and timestamps; do not infer consent from call connection. |
| `order_id` | Optional stable backend ID created only after the caller confirms the complete order. |
| `outcome` | Controlled state such as `completed`, `caller_hangup`, `failed`, or `needs_human`; no transcript or raw audio in routine logs. |

Both channels call the same business services; channel-specific wrappers handle provider/auth/media differences. Do not fork product rules, pricing, order validation, or SMS policy by transport.

## Shared AI order, Sheets, and SMS lifecycle

1. Vertex AI collects structured fields and reads back the order summary; unstructured transcript text is not an authoritative order.
2. Caller explicitly confirms. The order API validates SKUs, quantities, prices, COD/payment rules, address, and phone. Create an immutable `order_id`/`ordernumber`.
3. Store the order and durable outbox items atomically (for example Firestore transaction). Google Sheets is a reporting copy; it is not the system of record.
4. Upsert a row using `ordernumber` to avoid duplicate rows on retries. Record Sheets sync outcome and retry errors in backend state.
5. Send the confirmation SMS only after (a) the confirmed order exists, (b) the server/provider confirms the call ended, (c) a verified destination phone exists, and (d) explicit SMS consent is recorded. Reconcile uncertain Twilio send results before retrying.
6. Record Twilio Message SID and status callback (`SENT`, `DELIVERED`, `FAILED`, or `SKIPPED` at the user-facing workflow level); `SENT` means accepted by Twilio, not necessarily delivered to handset.
7. Handle STOP/opt-out, consent withdrawal, duplicate provider callbacks, and retry idempotency. Never include full transcripts, payment data, credentials, or an unnecessary full delivery address in SMS.

### Google Sheet layout matching the supplied image

Use the image's exact 17 headers and order in the `Orders` tab, with one row per order. `ordernumber` is the stable upsert key, never the sheet row number. Preserve leading zeroes for postal codes and phone numbers; backend stores exact UTC timestamps and integer money values.

| # | Header | Stored value and rule |
|---:|---|---|
| 1 | `Orders date` | Date derived from confirmed order creation time; exact UTC timestamp stays in backend. |
| 2 | `ordernumber` | Unique immutable backend order ID; display formatting may follow the sample but is not row-derived. |
| 3 | `Agent` | Fixed label such as `AI Voice Agent`, with auditable later assignment if needed. |
| 4 | `customer` | Confirmed name only if needed for fulfillment. |
| 5 | `address` | Confirmed primary delivery address. |
| 6 | `address1` | Additional delivery detail; do not duplicate `address`. |
| 7 | `Postcode` | Text to preserve leading zeroes. |
| 8 | `Phone_number` | Verified customer SMS/delivery phone; normalize internally to E.164. |
| 9 | `Product` | Readable SKU/product, quantity, and promotion summary generated from structured items. |
| 10 | `Price` | Confirmed numeric order total in the agreed currency; define shipping/discount policy. |
| 11 | `Remark` | Optional minimal fulfillment note only; never transcript/secrets/payment credentials. |
| 12 | `ประเภทชำระเงิน` | Controlled payment method, such as `เก็บเงินปลายทาง`; not proof of payment. |
| 13 | `COD` | Numeric amount to collect; zero if not applicable and validated against business rules. |
| 14 | `Track` | Blank until assigned by fulfillment; never AI/caller guessed. |
| 15 | `status` | Controlled fulfillment state, agreed with operations. |
| 16 | `Check` | Boolean; `TRUE` only after backend validation and explicit caller confirmation. |
| 17 | `NotifySMS` | State such as `PENDING`, `SENT`, `DELIVERED`, `FAILED`, or `SKIPPED`. |

Keep channel, call/session IDs, order/confirmation timestamps, structured order items, SMS consent, Twilio Message SID, callback state, idempotency keys, and Sheets errors in the backend's protected order/outbox records. A restricted `OrderItems` tab may contain one row per order/SKU with quantity and amounts. Do not store card numbers, CVV, or authentication credentials. Phone numbers and delivery details are personal data; restrict access and approve retention/deletion policy.

## Security, privacy, and operations

- **Account separation:** GCP project `gen-lang-client-0845508747` is administered with `smpmfast@gmail.com`; Twilio resources use `csdeebuddy@gmail.com`. Runtime uses a dedicated Cloud Run identity and ADC; no service-account key files.
- **Provider secrets:** Twilio Auth Token and Voice SDK API Key secret stay in Secret Manager, never frontend bundle, URL, spreadsheet, or logs. Use least privilege, secret rotation, and separate dev/test/prod credentials.
- **Webhook validation:** Verify `X-Twilio-Signature` with the exact canonical URL and full form parameters on both PSTN and TwiML App routes. Reject unexpected numbers/identities/parameters. Apply replay/idempotency and request-size limits.
- **Browser protection:** HTTPS-only secure context, restrictive CSP, same-origin authenticated token endpoint, CSRF protection as applicable, short token TTL, one identity per session, rate limits/CAPTCHA or equivalent abuse controls, and origin restrictions. A token must not grant PSTN outbound calling unless explicitly required and constrained.
- **Audio/privacy:** Recording off by default. Provide notice and obtain legally appropriate consent for audio/AI processing. Minimize retention, redact logs, define access/deletion process, and review Thai PDPA plus cross-border processing for the configured Vertex AI region (`us-central1` observed in current adapter).
- **Media reliability:** Use Twilio SDK's supported ICE/STUN/TURN connectivity; do not open public PBX SIP/RTP/AudioSocket ports for WebRTC. Test corporate firewall, mobile networks, browser permissions, Bluetooth/headsets, packet loss, and reconnects.
- **Abuse/cost controls:** Per-IP/session concurrency and duration quotas, authenticated order API, caller rate limits, maximum call length, Twilio/GCP budgets and alerts, provider fraud controls, and incident runbooks.
- **Fallback:** Define a deterministic human handoff or fail-safe message. Neither current gateway nor adapter proves live human transfer; never advertise this until a real destination and handoff are tested.
- **Observability:** Correlate with pseudonymous session ID and provider Call SID; metrics per channel for connect success, setup latency, disconnect reason, audio errors, AI errors, order confirmation, Sheets lag, SMS outcome, and cost. Do not log raw audio, full transcripts, tokens, or unnecessary phone/address data.

## Implementation sequence

1. **Common contracts:** Define `VoiceSession`, channel enum, structured order schema, order confirmation, call-completion event, idempotency policy, and consent states.
2. **Harden/deploy PSTN gateway:** Add Auth Token secret version through Console/Secret Manager; deploy privately behind application-level signature verification; test with an isolated controlled number or approved test window before changing the production DID webhook.
3. **Order backend:** Implement authenticated order API, authoritative catalog/pricing validation, Firestore order + outbox transaction, Sheets upsert worker, and Twilio Messaging worker with callbacks and opt-out enforcement.
4. **WebRTC token and route:** Create TwiML Application and API Key in the intended Twilio account; add a backend token endpoint and separate signed `/twilio/webrtc/voice` route; use Twilio Voice JS SDK on an HTTPS page with explicit microphone and privacy UX.
5. **Shared AI behavior:** Add structured order/function calling and confirmation to Vertex Live; validate tool arguments server-side and require user confirmation before commit.
6. **Channel integration tests:** Test PSTN and WebRTC independently through the same gateway/AI/order backend, then test cross-channel deduplication and post-call side effects.
7. **Controlled pilot:** Enable one channel at a time behind an operational feature flag; preserve webhook rollback, watch quotas/cost, and require owner approval before any production call-routing change.

## Release gates

### Telephone

- Verify Twilio DID, Voice webhook, signed callback behavior, and fallback; run supervised inbound calls.
- Confirm bidirectional intelligible media, barge-in/DTMF behavior as designed, hangup handling, concurrency, timeout, and rollback.

### WebRTC

- Verify token authentication, short expiry, identity binding, restricted TwiML Application, browser permission denial, unsupported browser, network loss, and SDK reconnection.
- Test Chrome/Edge/Safari versions in scope plus mobile/corporate networks; validate echo, jitter, packet loss, microphone selection, and user-visible disconnect states.
- Confirm WebRTC creates no unapproved PSTN destination and cannot alter the server-side stream route.

### Shared services and production

- Duplicate/replayed webhooks do not create duplicate orders, sheet rows, or SMS.
- No SMS without an explicitly confirmed order, completed call, verified destination, recorded consent, and no active opt-out.
- Sheets/Twilio/Vertex outage recovery, alerting, retention, access, cost limits, and incident response are exercised.
- No production readiness claim until each channel's tests and a supervised end-to-end sale pass.

## Related standards

Use current official Twilio Programmable Voice/Voice SDK and Media Streams documentation, Vertex AI Live API documentation, OAuth 2.0 token security guidance, RFC 6455 (WebSocket), RFC 8825 (WebRTC architecture), and applicable Thai PDPA requirements as implementation references. Reference alignment is not a compliance certification.
