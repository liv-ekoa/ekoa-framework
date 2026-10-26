# Preview branch

This branch is the whole Ekoa site running on **fictional schools and people**, so the team can
click through every screen (student, teacher, steward, partner, peer auditor and guardian) before
launch. It never connects to the real database: everything you do is kept in your own browser.

## How to look around

1. Open the preview link (see below).
2. Click **Sign in**. Instead of an email box you get a list of people. Pick one to see Ekoa as
   that role: a Project Lead or Implementation Team member (students), a Faculty Liaison
   (teacher), the Ekoa steward, a partner, a peer auditor, or a student still waiting for
   guardian consent.
3. **Switch person** in the coloured bar at the top of the app takes you back to the list.
4. **Settings → Reset demo data** puts everything back to the start.

## Where the preview link is

Cloudflare builds a separate preview of each branch that is pushed to GitHub (when preview builds are on for the
`ekoa-framework` Worker). Find it in GitHub on the branch's latest commit (the Cloudflare check)
or in the Cloudflare dashboard under the Worker's deployments. It does not change ekoa-framework.org.

## Never merge this branch into main

Merging would replace the real site with the fictional one. As a safety net, `scripts/preview-guard.mjs`
makes the build fail on `main`, so the live site keeps its last real version until the merge is undone.

To review a change, make it on its own branch from `main`. To refresh this preview with the
latest site, merge `main` into this branch (not the other way round).
