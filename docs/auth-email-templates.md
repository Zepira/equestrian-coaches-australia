# Supabase auth email templates

Paste these into Supabase: **Authentication → Email Templates**. Two templates
change: **Confirm signup** and **Reset password**. Each has a subject line and a
body (the body field takes HTML; use the source view).

Supabase sends these through Resend (custom SMTP, set up 27 Sep 2026) as
`Equine Professionals Australia <notifications@send.equineprofessionals.com.au>`.
Supabase's SMTP settings have no reply-to, so a reply goes nowhere. That is why
each email ends by pointing people to hello@equineprofessionals.com.au.

## Why the link is built from `{{ .RedirectTo }}`

The link goes to `/auth/confirm` on **the host the person signed up on**, with
the hashed token on the end. `/auth/confirm` checks the token on the server
(`verifyOtp`), so it works in whatever browser opens the email. The old
`{{ .ConfirmationURL }}` link used the PKCE flow, which needs a cookie that only
exists in the browser that started the sign-up: sign up in Messenger's browser,
open the email in Gmail's, and it failed.

- `{{ .SiteURL }}` is always the production domain, which is still the coming
  soon page and would swallow `/auth/confirm`. So it isn't used.
- `{{ .RedirectTo }}` is the address the page passed to Supabase:
  `https://<the host they were on>/auth/confirm?next=<where to go after>`
  (built by `confirmRedirect()` in `src/lib/site-url.ts`). It always carries a
  `?`, so the template adds the token with `&`.
- **That address must match an entry in Redirect URLs** (Authentication → URL
  Configuration). If it doesn't, Supabase quietly swaps in the Site URL, the
  link loses `/auth/confirm` and it breaks. The entries are in `docs/launch.md`.
- **No `{{ if }}` inside the link.** Supabase renders templates with Go's
  `html/template`, which escapes by context and refuses an `if` whose branches
  leave a URL in different states (a bare value in one, `…?next=` in the
  other). The email then fails with "Error sending confirmation email" and
  nothing goes out. That happened on 27 Sep 2026 with an earlier version of
  these templates that fell back to `{{ .SiteURL }}`. So the link is only
  `{{ .RedirectTo }}` plus the token, and every path that sends these emails
  (sign-up, "send it again", forgot password) passes a redirect. An email sent
  by hand from the Supabase dashboard has no redirect and its link won't work;
  send those from the site instead.

Checked against Supabase's docs on 27 Sep 2026: *Email Templates* (the
variables, including that `{{ .RedirectTo }}` is the URL passed to `signUp` /
`resetPasswordForEmail` and falls back to the Site URL when it isn't allowed)
and *Email-based auth with PKCE flow for SSR* (the `token_hash` + `type` link
and `verifyOtp`, with `type=email` for sign-up and `type=recovery` for reset).
Their example builds the link on `{{ .SiteURL }}` and passes `{{ .RedirectTo }}`
as `next`; ours starts from `{{ .RedirectTo }}` because our Site URL is not the
host people sign up on before launch.

---

## Confirm signup

**Subject**

```
Confirm your email for Equine Professionals Australia
```

**Body**

```html
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #22201c; max-width: 520px;">
  <p>{{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hi,{{ end }}</p>
  <p>Thanks for signing up to Equine Professionals Australia. Tap the button to confirm this is your email address.</p>
  <p style="margin: 28px 0;">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email"
       style="background: #b4553a; color: #f6f1e7; padding: 14px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; display: inline-block;">Confirm my email</a>
  </p>
  <p>You can open this on a different phone or computer from the one you signed up on. The link works once.</p>
  <p>If the button doesn't work, copy this into your browser:<br>
    <span style="word-break: break-all; font-size: 13px; color: #4a4842;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email</span>
  </p>
  <p>Didn't sign up? Ignore this email and nothing will happen.</p>
  <p style="margin-top: 28px; font-size: 14px; color: #4a4842;">Questions? Write to <a href="mailto:hello@equineprofessionals.com.au" style="color: #b4553a;">hello@equineprofessionals.com.au</a>. Replies to this email don't reach anyone.</p>
</div>
```

---

## Reset password

**Subject**

```
Set a new password for Equine Professionals Australia
```

**Body**

```html
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #22201c; max-width: 520px;">
  <p>{{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hi,{{ end }}</p>
  <p>Someone asked to reset the password for this email address on Equine Professionals Australia. If that was you, tap the button to choose a new one.</p>
  <p style="margin: 28px 0;">
    <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery"
       style="background: #b4553a; color: #f6f1e7; padding: 14px 24px; border-radius: 999px; text-decoration: none; font-weight: bold; display: inline-block;">Set a new password</a>
  </p>
  <p>The link works once. If it has expired, ask for another on the log in page under "Forgot password?".</p>
  <p>If the button doesn't work, copy this into your browser:<br>
    <span style="word-break: break-all; font-size: 13px; color: #4a4842;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery</span>
  </p>
  <p>Didn't ask for this? Ignore it and your password stays as it is.</p>
  <p style="margin-top: 28px; font-size: 14px; color: #4a4842;">Questions? Write to <a href="mailto:hello@equineprofessionals.com.au" style="color: #b4553a;">hello@equineprofessionals.com.au</a>. Replies to this email don't reach anyone.</p>
</div>
```

---

Words written with the `site-copy` skill and checked with the humanizer pass.
