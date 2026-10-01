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
- Data access uses the browser client with RLS; tenant access is derived by matching the JWT email to `units.email` (`owns_unit`) — keeps unit linking to "admin types the email".
- First authenticated user becomes admin via `claim_admin_if_none()` RPC in the `_authenticated` gate — bootstraps without manual SQL.
- Files live in private bucket `anexos` under `<unit_id>/...` paths; storage RLS keys off the first folder segment.
- Signed-in pages live under `src/routes/_authenticated/`; role (`isAdmin`) comes from that layout's route context.
