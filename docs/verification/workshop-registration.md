# Workshop registration measurement

The registration journey uses existing `click_events` and first-touch attribution.
Every event below requires analytics consent. Missing events do not prove that a
visitor abandoned the form. Do not divide all database-created accounts by
consenting browser sessions to report a conversion rate.

| Event suffix (`workshop_registration_`) | Meaning |
| --- | --- |
| `started` | First form change in this mounted registration page |
| `validation_blocked` | Fixed field/category label; repeated native field errors are deduplicated until the next submitted request |
| `security_ready`, `security_expired`, `security_failed` | Security widget state, without the token or provider error text |
| `submit_clicked` | Validated request sent to `register-workshop` |
| `completed` | Server returned a created user ID; metadata `stage=account_created`. This is the existing conversion event, not approval/activation. |
| `confirmation_required` | Created account has no returned session; user is directed to email confirmation instructions |
| `session_ready` | The returned session was installed successfully |
| `session_failed` | Account was created but automatic sign-in failed; the UI directs the user to sign in, not register again |
| `failed` | Registration request failed or returned an invalid response; fixed HTTP/network category only |

No field contents, email addresses, passwords, security tokens, or raw exception
messages belong in analytics. Raw server messages may be displayed to the user
but must not become tracking metadata. Completion is recorded once per successful
request; in-flight duplicate submits are blocked.

Email confirmation, admin approval, first quote and first service order remain
separate operational database states. These browser events do not establish any
of those milestones. The existing direct invitation links have UTM attribution;
per-recipient link redirects and email-delivery webhooks are outside this change.

## Verification scope

Component integration tests use isolated registration/session responses and
exercise consent, validation, expiry, retries, agreement close buttons, success
and session failure. Turnstile tests simulate stalled loading and provider
callbacks without bypassing the production server check. Local browser checks
use external services replaced by test fixtures and a local-only backend URL.
No production accounts, customer requests, emails or legal acceptances are created.

A real isolated Auth → confirmation email → admin approval → first quote test
still requires an appropriate test backend and mailbox. Passing the UI tests does
not verify SMTP delivery or production activation.

## Existing agreement gap, 2026-09-08

Repository search, `terms_versions`, and document-storage filename search found
no full DPA. `terms_versions` only contains the summary “GDPR, hantering av
kunduppgifter, radering” (version 2026-07-28). Registration currently records
version 2026-08-06. Do not turn the summary or privacy policy into a DPA link.
The owner must supply the approved agreement and confirm the corresponding
version before the checkbox and platform agreement can link to it. Agreement
wording and acceptance versions were not changed by this implementation.
