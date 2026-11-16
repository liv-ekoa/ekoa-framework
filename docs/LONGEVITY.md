# Keeping Ekoa going: longevity and succession plan

Students graduate. Ekoa must not. This plan makes sure every school always has a current **Ekoa Representative** and a named **Future Ekoa Representative**, that handover happens on a fixed calendar with a signed packet, and that the people running the platform itself are never a single person.

Everything below says who does it, where in the app, and by when. Items marked **[GAP]** do not work in the app yet; section 10 lists each one with the fix (gaps 1 to 3 are fixed).

---

## 1. The rule

**Every seat has a holder and a successor, and every successor is named at least one full term before the holder leaves.**

| Seat | Holder | Successor | Named by |
| --- | --- | --- | --- |
| Ekoa Representative (`ekoa_rep`) | Current Rep | Future Ekoa Representative | Faculty Liaison with the current Rep |
| Project Lead (`project_lead`) | Current Lead | Next Lead (already required at the Implement gate) | Current Lead |
| Faculty Liaison (`faculty_liaison`) | Teacher A | Backup Liaison, a second teacher | Principal |
| Ekoa Steward (`steward`) | Steward 1 | Steward 2 and 3 | Existing stewards |
| Audit school | School 1 and 2 | Standby audit school | Stewards |

A school with a seat that has no successor is **at risk**, even if the seat is filled.

## 2. Who can be the Future Ekoa Representative

- A current student of the school, **at least one year of school left** when they take over. In a school that runs to Grade 12, that means Grade 11 or lower on handover day.
- **Must be a different student from the current Rep**, and should be from a younger grade.
- Has guardian consent recorded as **consent given**. A student with consent pending sees nothing, so cannot shadow anything.
- Is not already the Project Lead, unless the school has fewer than 8 active students on the platform. At small schools one student may hold both seats (the app allows several roles per person).

## 3. The school calendar

Dates are set from **the school's own term end**, not the calendar year. Use the table with your school's date; "T" is the day the outgoing Rep's term ends (`term_end` on their role).

| When | What | Who | Where in the app |
| --- | --- | --- | --- |
| **First 30 days of the school year** | Confirm one Faculty Liaison **and** one Backup Liaison. Confirm the current Rep and set their **Term ends** date. | Liaison | **My school → People** |
| **By day 45 of the year** | Name the Future Ekoa Representative: **Invite a member**, Role *Ekoa Representative*, "What your school calls it" = `Future Ekoa Representative`, **Term ends** = one year after T, **Starts on** = T (the day the current Rep's term ends). This makes them *incoming*: they can read and comment, not change anything, until handover. Guardian name and email required for under 18s. | Liaison | **My school → People → Invite a member** |
| **By end of term 1** | Future Rep has signed in and joined one network call as an observer. | Current Rep | n/a |
| **T minus 180 days** | Future Rep co-writes one Implementation Record with the Rep. | Rep and Future Rep | Project → Record tab |
| **T minus 56 days (8 weeks)** | Handover starts. The dashboard shows a clay alert ("term ends in N days. Start the handover packet"). Open **Handover**, choose the successor in the **Successor** list, press **Start the handover packet**. | Outgoing Rep | **Handover** tab (top menu) |
| **T minus 49 days** | Outgoing Rep writes the **Note from the outgoing lead**: who to call, what is stuck, what they would do next. Minimum 150 words. | Outgoing Rep | Handover → note |
| **T minus 42 days** | Checklist item 1 and 2 ticked: *Incoming lead has read the packet* and *Shadow access started*. | Incoming | Handover → Checklist |
| **T minus 28 days** | Handover meeting held with the Liaison (30 minutes, in person). Checklist item 3 ticked. | Liaison, both Reps | Handover → Checklist |
| **T minus 21 days** | Archive check: every finished project has an Implementation Record with evidence. Checklist item 4 ticked. | Outgoing Rep | Library, then Handover |
| **T minus 14 days** | Three signatures complete: **Outgoing lead**, **Incoming lead**, **Faculty liaison**. | Each signs for themselves | Handover → Signatures |
| **T (handover day)** | Liaison presses **Switch roles now**. Outgoing role becomes `alumni`, incoming becomes `active`. Roles do not switch by themselves; the liaison must press it. | Liaison | Handover |
| **T plus 7 days** | New Rep invites their own Future Rep (return to the "By day 45" row, moved forward to T plus 7 and capped at T plus 45). | New Rep and Liaison | My school → People |
| **T plus 90 days** | Alumnus answers questions for one term, then goes quiet. | Alumnus | n/a |

If T falls in an exam period, move every date **earlier**, never later.

## 4. What counts as "handed over"

A handover is complete only when **all** of these are true:

1. A handover packet exists (Handover → *Start the handover packet*), built from live data: open projects and their next task, stalled approvals, latest numbers, lessons, and who to ask.
2. The **outgoing Rep's note** is written.
3. All **four checklist items** are ticked.
4. All **three signatures** show a date.
5. The Liaison pressed **Switch roles now**, so the outgoing person's role reads *alumni* and the incoming person's reads *active*.
6. The new Rep has named their own Future Rep (or has a calendar date to do so within 45 days).

The Handover page shows "% of handovers fully signed". The target is **100%**; anything below 100% on 31 July (or the school's equivalent) is reviewed by a steward.

## 5. Early warning: the school is at risk when…

The dashboard already warns about three of these. The rest need a steward to check, or the **[GAP]** report in section 10.

| Trigger | Already shown in the app? |
| --- | --- |
| A student role ends in 56 days or fewer and no packet is started | Yes (dashboard alert, `schoolAlerts`) |
| No active Ekoa Rep, Project Lead or Faculty Liaison at all | Yes (red alert) |
| A project has had no activity for 30 days | Yes |
| A weekly measurement is more than 9 days late | Yes |
| No Future Ekoa Representative by day 45 of the year | **[GAP]** |
| Only one Faculty Liaison on the school | **[GAP]** |
| Liaison has not signed in for 60 days | **[GAP]** |

**Steward action when a school is at risk:** email the Liaison within **2 working days**, offer a 30-minute call within **10 working days**, and write the outcome in the audit log. If there is still no named Future Rep **30 days later**, the steward asks the Principal by email to name an interim one.

## 6. If a seat goes empty anyway

| Situation | What happens, by whom, by when |
| --- | --- |
| Rep leaves suddenly, Future Rep exists | Liaison promotes the Future Rep the same week (Handover, *Switch roles now*) and files a short note instead of the full packet. |
| Rep leaves suddenly, no Future Rep | The Project Lead holds the Rep role too (**My school → People → Role**). The Liaison names a Future Rep within **30 days**. |
| Faculty Liaison leaves | The **Backup Liaison** takes over the same day. If there is no backup, a steward pauses new student invitations and asks the Principal for a new liaison within **14 days**. A school with no adult cannot verify data or manage consent. |
| No student active for 90 days | Stewards mark the school dormant. Its published records stay public and unchanged. |
| Dormant for 12 months | Workspace is archived, **never deleted**. A new team re-applies at `/join`; a steward links it to the same school. |

## 7. How people join

### A new school
1. Apply at **/join**. Say whether the school has a student lead.
2. A steward reviews it within **7 days** and, in the steward console, uses **Schools → Invite faculty liaison**.
3. The liaison signs in with the magic link (email only; no passwords).
4. Inside **30 days** the liaison invites: a Project Lead, one more student, a Backup Liaison, an Ekoa Representative **and** a Future Ekoa Representative. Under-18s need a guardian email; the consent link is emailed or copied from the People tab.
5. The school is not counted as active until the minimum team (one teacher plus one student, `MINIMUM_TEAM`) **and** a named Future Rep are in place.

### A new student at an existing school
The Liaison uses **My school → People → Invite a member**. The student starts as *Implementation Team* and sees nothing until the guardian consents.

### A new teacher
Liaison invites them as *Faculty Liaison* or *Approver* with age band 18+. Only adults can hold these roles.

### A new steward, partner or audit school
Only existing stewards can grant these. The database refuses everyone else. Stewards must be adults.

### Someone who wants to work on the code or method
1. Read `README.md` and `CLAUDE.md`.
2. `npm install`, copy `.env.production` to `.env.local`, `npm run dev`, open http://localhost:5173.
3. The method (stages, gates, roles, metrics) is data in `src/lib/ekoa.ts`; all reads and writes go through `src/lib/api.ts`.
4. A schema change goes in a **new** numbered file in `supabase/migrations/`, never an edit to an applied one.
5. Before opening a pull request: `npm run build` and `npm run test:db` must pass.
6. Pull requests go to `main`. Pushing to `main` deploys the live site, so merge only after a second person has reviewed it.
7. Never weaken consent, cross-school or peer-audit rules.

## 8. Keeping the platform itself alive

Every account below needs **at least two adult owners** by 31 December 2026, plus the date of the last check written next to it.

| Account | Owner 1 | Owner 2 | Last checked |
| --- | --- | --- | --- |
| GitHub repository `liv-ekoa/ekoa-framework` | *name* | *name* | *date* |
| Cloudflare Worker `ekoa-framework` and domain `ekoa-framework.org` | *name* | *name* | *date* |
| Supabase project `ekoa` (ref `gpwsedgicmpkxjqashbn`) | *name* | *name* | *date* |
| Email service for sign-in links (for example Resend) | *name* | *name* | *date* |
| Contact mailbox (`VITE_CONTACT_EMAIL`, `EMAIL_FROM`) | *name* | *name* | *date* |
| Anthropic API key for `ai-draft` (secret, never in the repo) | *name* | *name* | *date* |

Add people as members of each service. **Never share a password.**

**Recurring tasks**

| Task | When | Who |
| --- | --- | --- |
| Export the database and the `evidence` bucket, store the copy with someone who is not the primary owner | First Monday of each month | Steward 2 **[GAP: not automated]** |
| Run `npm run test:db` and confirm every line prints PASS | Before every deploy that touches `supabase/` | Whoever merges |
| Renew the domain | 60 days before expiry | Owner 1 |
| Confirm the safeguarding lead's training is current | Each June | Steward 1 |
| Review who holds `steward` and `partner` roles; remove anyone who has left | Each June and each December | Both stewards |
| Review the list of schools: any at risk or dormant? | Each term | Steward 2 |

## 9. Measuring whether it works

Report these each term to the stewards, and use them as the continuity indicators in `research/`.

| Measure | Target |
| --- | --- |
| Schools with a named Future Ekoa Representative by day 45 | 100% |
| Handovers with all 4 checklist items and all 3 signatures | 100% |
| Schools with a Backup Liaison | 100% |
| Projects that log a new measurement in the 90 days after their Lead changes | At least 80% |
| Schools still active 24 months after joining | At least 80% |
| Time from "no Rep" to a new Rep in place | 30 days or less |

## 10. What the app does not do yet (and the fix)

Found by reading the code on 10 November 2026.

| # | Gap | Where | Fix |
| --- | --- | --- | --- |
| 1 | ~~No way to create a role as incoming.~~ **Fixed 10 November 2026.** The invite form and the **Role** button now have **Starts on**; a future date creates an `incoming` role, so *Switch roles now* works. | `src/lib/api.ts` (`startFields`), `MySchool.tsx` | Done. |
| 2 | ~~Handover page promised an automatic switch on the term date.~~ **Fixed.** It now says the liaison presses *Switch roles now*. | `Handover.tsx` | Done. A scheduled job could still be added later. |
| 3 | ~~Successor list did not highlight incoming people.~~ **Fixed.** Incoming people are listed first and labelled "(incoming)". | `Handover.tsx` | Done. |
| 4 | No "Backup Faculty Liaison" concept. | `src/lib/ekoa.ts` | Require two active `faculty_liaison` roles for a school to count as active. |
| 5 | No steward report of at-risk schools (section 5). | `src/pages/app/Steward.tsx` | Add a table: school, liaisons, Rep, Future Rep, days to next term end, days since last activity. |
| 6 | No email reminders at T minus 56, 28 and 14 days, or at day 45 with no Future Rep. | README "Next" list | Scheduled edge function using `RESEND_API_KEY`. |
| 7 | Dashboard alerts exist but there is no alert for "no Future Rep". | `schoolAlerts` in `src/lib/bundle.ts` | Add one alert when a school has an active `ekoa_rep` and no `incoming` or second `ekoa_rep`. |
| 8 | No scheduled backup. | Supabase | Enable point-in-time backup on the project plan, or a monthly export job. |

## 11. Decisions to make this month

| Decision | Recommendation | Decide by |
| --- | --- | --- |
| Who is Steward 2 and Steward 3? | One more adult from an audit school, one from a partner organisation | 30 November 2026 |
| Who are Owner 2 for GitHub, Cloudflare, Supabase, domain, email? | A second adult for each; fill section 8 | 31 December 2026 |
| Name for the second Rep seat | "Future Ekoa Representative" | Now |
| Standby audit school | One more school, so the two audit schools are never the only two | 31 March 2027 |
| Fix gaps 1 to 3 in the app | Done 10 November 2026 | Done |
