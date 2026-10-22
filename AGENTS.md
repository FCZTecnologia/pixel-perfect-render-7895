<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Department contacts are shared through an authenticated page; database policies allow only admins to create/edit and current unit owners to read, with no anonymous access.
- Unit deletion uses the authenticated security-invoker delete_unit RPC, which verifies the admin role and atomically deletes targeted notices and the unit with cascading history; deleting a unit removes tenant ownership without deleting a potentially shared login.
- Data access uses the browser client with RLS; tenant access comes from `owns_unit` (unit's `login_user_id` or legacy email match, non-terminated units only).
- Tenant logins are created by admins via server functions (`tenants.functions.ts`) as username + synthetic email `<user>@condomio.app`; there is no public signup.
- Contract termination exports a client-side HTML report, then sets `terminated_at`, inactivates the unit and bans the login; re-renting requires a new unit row.
- Unit filters share active/non-terminated eligibility; termination checks unpaid bills and pending/in-progress orders through RLS, requires acknowledgment when present, and rechecks the report before exporting so newly changed pending items must be reviewed.
- First authenticated user becomes admin via `claim_admin_if_none()` RPC in the `_authenticated` gate — bootstraps without manual SQL.
- Files live in private bucket `anexos` under `<unit_id>/...` paths; storage RLS keys off the first folder segment.
- Signed-in pages live under `src/routes/_authenticated/`; role (`isAdmin`) comes from that layout's route context.
- Notices use a nullable unit target and a separate reply thread; RLS restricts targeted notices and replies to admins and current unit owners so general announcements remain read-only for tenants.
- Invoice due dates are calendar dates and payment confirmation is stored on each bill; browser updates use admin-only RLS and shared billing status logic to keep all bill displays consistent.
- Content-route metadata uses leaf-specific titles and descriptions; shared pageMeta supplies the standard social tags for protected pages.
- Custom SMTP uses admin-validated server functions, an AES-GCM encrypted configuration in private storage, and implicit TLS only; production uses the Worker-native mailer and local development uses Nodemailer. Notifications derive recipients from active unit contact emails and preserve saved bills/notices when sending fails; per-event storage markers avoid ordinary duplicate sends without a queue or email tables.
