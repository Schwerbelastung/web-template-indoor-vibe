# Indoor-biking experience badges — admin guide

Badges show a user's indoor-biking experience on their **profile page** and in the **author
section of their listings**. Only the marketplace admin can grant or remove them — users cannot
set the badge themselves.

There are three tiers:

| Value | Badge shown             | Look   |
| ----- | ----------------------- | ------ |
| `"1"` | Indoor rider · 1+ years | bronze |
| `"2"` | Indoor rider · 2+ years | silver |
| `"3"` | Indoor rider · 3+ years | gold   |

## How to grant a badge (in Sharetribe Console)

1. Open [Console](https://console.sharetribe.com) and pick the right environment (Dev / Test / Live).
2. Go to **Manage → Users** and click the user.
3. Scroll to the **Metadata** section and click **Edit**.
4. Enter this JSON (or add the key to whatever is already there — keep existing keys!):

   ```json
   {
     "indoorExperienceYears": "2"
   }
   ```

   Use `"1"`, `"2"` or `"3"` (with the quotes). Any other value is ignored and no badge shows.

5. Save. The badge appears on the user's profile page and their listings' author section on the
   next page load.

## How to remove a badge

Edit the same Metadata JSON and delete the `"indoorExperienceYears"` line (leave other keys
intact), then save.

## Why metadata?

Profile **metadata** can only be written by the operator (Console or Integration API) but is
publicly readable — exactly right for an admin-granted, publicly visible badge. Users *can* edit
their own profile `publicData`, which is why the badge intentionally does not read from there.

## For developers

The badge is rendered by `src/components/ExperienceBadge/ExperienceBadge.js`, used in
`src/containers/ProfilePage/ProfilePage.js` and
`src/containers/ListingPage/UserCard/UserCard.js`. An invalid or missing value renders nothing.
The E2E test `e2e/badges.spec.js` activates when the env var `E2E_BADGE_USER_ID` is set to the
UUID of a user who has the badge (find the UUID in the Console user page URL).
