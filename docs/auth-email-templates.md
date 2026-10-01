# Supabase auth email templates

Paste these into Supabase: **Authentication → Email Templates**. They use the same shell as every other email the site sends (`src/lib/email-layout.ts`): cream ground, ink header with the horse and wordmark, white card, quiet footer. The logo loads from the public host, which serves `/brand/` before launch. Two templates
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
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Confirm your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f1e7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">One tap to confirm your email and get started.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f1e7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#fffdf8;border:1px solid #e7dac6;border-radius:18px;overflow:hidden;">

<tr><td style="background-color:#14281f;padding:22px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle;"><img src="https://equineprofessionals.com.au/brand/horse-cream-small.png" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;" /></td>
<td style="vertical-align:middle;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.1;color:#f6f1e7;">Equine Professionals</div>
<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#e8b79a;padding-top:3px;">Australia</div>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:32px 28px 8px;font-family:Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:30px;line-height:1.15;color:#14281f;">Confirm your email</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">{{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hi,{{ end }}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#22201c;">Thanks for signing up to Equine Professionals Australia. Tap the button to confirm this is your email address.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
<td style="background-color:#b4553a;border-radius:999px;">
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#f6f1e7;text-decoration:none;border-radius:999px;">Confirm my email</a>
</td>
</tr></table>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">You can open this on a different phone or computer from the one you signed up on. The link works once.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">Didn't sign up? Ignore this email and nothing will happen.</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6c685e;">If the button doesn't work, copy this into your browser:<br />
<span style="word-break:break-all;color:#4a4842;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email</span></p>
</td></tr>

<tr><td style="padding:0 28px;"><div style="height:1px;background-color:#e7dac6;"></div></td></tr>
<tr><td style="padding:18px 28px 24px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#6c685e;">Questions? Write to <a href="mailto:hello@equineprofessionals.com.au" style="color:#b4553a;text-decoration:underline;">hello@equineprofessionals.com.au</a>. Replies to this email don't reach anyone.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#6c685e;">Equine Professionals Australia · <a href="https://equineprofessionals.com.au" style="color:#6c685e;text-decoration:underline;">equineprofessionals.com.au</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

## Reset password

**Subject**

```
Set a new password for Equine Professionals Australia
```

**Body**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Set a new password</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f1e7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">A link to choose a new password.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f1e7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#fffdf8;border:1px solid #e7dac6;border-radius:18px;overflow:hidden;">

<tr><td style="background-color:#14281f;padding:22px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle;"><img src="https://equineprofessionals.com.au/brand/horse-cream-small.png" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;" /></td>
<td style="vertical-align:middle;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.1;color:#f6f1e7;">Equine Professionals</div>
<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#e8b79a;padding-top:3px;">Australia</div>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:32px 28px 8px;font-family:Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:30px;line-height:1.15;color:#14281f;">Set a new password</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">{{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hi,{{ end }}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#22201c;">Someone asked to reset the password for this email address on Equine Professionals Australia. If that was you, tap the button to choose a new one.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
<td style="background-color:#b4553a;border-radius:999px;">
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#f6f1e7;text-decoration:none;border-radius:999px;">Set a new password</a>
</td>
</tr></table>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">The link works once. If it has expired, ask for another on the log in page under "Forgot password?".</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">Didn't ask for this? Ignore it and your password stays as it is.</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#6c685e;">If the button doesn't work, copy this into your browser:<br />
<span style="word-break:break-all;color:#4a4842;">{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery</span></p>
</td></tr>

<tr><td style="padding:0 28px;"><div style="height:1px;background-color:#e7dac6;"></div></td></tr>
<tr><td style="padding:18px 28px 24px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#6c685e;">Questions? Write to <a href="mailto:hello@equineprofessionals.com.au" style="color:#b4553a;text-decoration:underline;">hello@equineprofessionals.com.au</a>. Replies to this email don't reach anyone.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#6c685e;">Equine Professionals Australia · <a href="https://equineprofessionals.com.au" style="color:#6c685e;text-decoration:underline;">equineprofessionals.com.au</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```


---

## Password changed (security notification)

Sent after a password changes, whether through "Forgot password?" or anywhere
else. Supabase only sends it once the notification is switched on for the
project: **Authentication → Emails**, the security notifications list, turn on
**Password changed**, then paste the subject and body below into its template.

It has no button on purpose. Before launch, any link to the site lands on the
coming soon page (the email has no `{{ .RedirectTo }}` to carry the host),
so it points people to "Forgot password?" and the hello@ inbox instead.
Variables used: `{{ .Email }}` and `{{ .Data.name }}`, both available to
every security notification.

The other security notifications (email changed, phone changed, sign-in method
linked or removed, verification method added or removed) stay off: the site
has no way to change any of those yet.

**Subject**

```
Your Equine Professionals Australia password was changed
```

**Body**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>Your password was changed</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f1e7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your password was just changed. Nothing to do if it was you.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f1e7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#fffdf8;border:1px solid #e7dac6;border-radius:18px;overflow:hidden;">

<tr><td style="background-color:#14281f;padding:22px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle;"><img src="https://equineprofessionals.com.au/brand/horse-cream-small.png" width="34" height="34" alt="" style="display:block;width:34px;height:34px;border:0;" /></td>
<td style="vertical-align:middle;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:1.1;color:#f6f1e7;">Equine Professionals</div>
<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:2.4px;text-transform:uppercase;color:#e8b79a;padding-top:3px;">Australia</div>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:32px 28px 8px;font-family:Helvetica,Arial,sans-serif;">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:30px;line-height:1.15;color:#14281f;">Your password was changed</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">{{ if .Data.name }}Hi {{ .Data.name }},{{ else }}Hi,{{ end }}</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">The password for your Equine Professionals Australia account ({{ .Email }}) was just changed.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">If that was you, there's nothing else to do.</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#22201c;">If it wasn't, someone else may know your password. Set a new one straight away with "Forgot password?" on the log in page, then write to us at <a href="mailto:hello@equineprofessionals.com.au" style="color:#b4553a;text-decoration:underline;">hello@equineprofessionals.com.au</a> so we can check your account with you.</p>
</td></tr>

<tr><td style="padding:0 28px;"><div style="height:1px;background-color:#e7dac6;"></div></td></tr>
<tr><td style="padding:18px 28px 24px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#6c685e;">We send this whenever an account password changes, so you always know. Replies to this email don't reach anyone.</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#6c685e;">Equine Professionals Australia · <a href="https://equineprofessionals.com.au" style="color:#6c685e;text-decoration:underline;">equineprofessionals.com.au</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
```

---

Words written with the `site-copy` skill and checked with the humanizer pass.
