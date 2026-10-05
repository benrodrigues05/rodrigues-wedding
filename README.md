# Benjamin & Talisha — wedding invitation

A phone-first wedding invitation website. Guests see a sealed envelope with a
stamp and a wax seal. One tap turns it over, breaks the seal, slides the letter
out and unfolds it into the invitation. Below it: a live countdown, the
details, the venue, dress code, where to stay, getting there, an RSVP reply
card, and a playlist card where guests suggest songs.

**Live:** https://benrodrigues05.github.io/rodrigues-wedding/

Plain HTML, CSS and JavaScript. No build step, no framework.

```
site/            ← the website (this is all that gets published)
  index.html     all the words
  styles.css     colours, fonts and layout (palette at the very top)
  script.js      the envelope animation, the countdown and the RSVP form
  assets/        embroidered art (made on Higgsfield), photo, icons, calendar file
tools/           not part of the site
  make_hero.py   puts a photo inside the embroidered arch
  ART.md         where every piece of art came from
  source/        arch artwork, original photo, retired art (kept on this Mac only)
```

To look at it locally, open `site/index.html` in a browser.

## The details on the invite

- Benjamin Rodrigues & Talisha Grobler
- Saturday 6 March 2027 (South African time)
- The chapel at Orchid House, Collisheen Estate, Esenembi Road, Ballito
- Running order: guests arrive 2:00 pm, ceremony 3:00 pm, reception and
  dinner to follow (times to come), carriages 11:00 pm
- RSVP by 1 December 2026
- No plus-ones: each invitation is for the person, couple or family it's
  addressed to, and one reply covers all of them
- Dress code: Garden Formal, bold colour (terracotta, marigold, chartreuse,
  emerald, fuchsia, plum), please avoid white; a pop of colour (tie, bow tie,
  hat, fascinator, scarf) is fine for anyone not buying something new
- Where to stay: Regal Inn Ballito, La Residence, Vallen Lodge, plus a link to
  more on LekkeSlaap (prices checked October 2026)
- The calendar file and Google link run 2 pm (arrival) to 11 pm

## RSVPs

Replies go to Formspree form `mkjogwgd` and land in Ben's inbox and the
Formspree dashboard. If sending ever fails, guests are shown Ben's email as a
one-tap backup (it's stored in two halves in the page so spam bots don't pick
it up).

Each reply contains: the invitation it came from (the `?to=` name on the
link), name(s), joyfully accepts or regretfully declines, dietary
requirements, email and a note. People who decline don't send dietary
requirements.

Playlist suggestions arrive in the same inbox with the subject
"Song request": one or two songs, who suggested them, and the invitation they
came from. They count towards the same monthly Formspree allowance.

Two things that cause silent problems:

- **The first reply triggers a confirmation email** from Formspree. Nothing is
  emailed until someone clicks it, although replies still land in the
  dashboard.
- **The free plan has a monthly submission cap shared across all your forms.**
  Wedding replies arrive in a burst, so check the dashboard in the first week.

## Personal links

Send every invited person, couple or family their own link. Add `?to=` to the
link and the envelope is addressed to them, their name is filled into the RSVP
and playlist cards, and every reply records which invitation it came from.

```
https://benrodrigues05.github.io/rodrigues-wedding/?to=Sarah%20%26%20James
https://benrodrigues05.github.io/rodrigues-wedding/?to=The%20Smith%20Family
```

(`%20` is a space and `%26` is `&`.) Without it the envelope reads
"To our favourite people". Links ending in `#rsvp` skip the envelope and jump
straight to the reply card, which is handy for reminders.

## Updating the live site

The site is served by GitHub Pages from the `gh-pages` branch, which holds
just the `site/` folder. After changing anything in `site/`:

```bash
git add -A && git commit -m "Update invitation"
git push origin main
git subtree push --prefix site origin gh-pages
```

GitHub republishes within a minute or two. The page asks search engines not to
index it, so it only reaches people who have the link.

## Changing the photo

```bash
python3 -m pip install numpy pillow
python3 tools/make_hero.py path/to/photo.jpg --span 225 1040
```

`--span` is the left and right edge of the couple in the photo, in pixels, so
you end up centred in the arch.

## How it behaves

- **Phones first.** Tested at 320px, 390px and 412px wide (Safari's engine
  and Chrome's), and on a 1440px laptop screen.
- **Tap again to skip** the envelope animation.
- **No JavaScript, no problem.** If the script can't load, the envelope never
  appears and the invitation shows straight away. The RSVP form then posts
  directly to Formspree.
- **Reduce Motion** (iPhone accessibility setting) swaps the animation for a
  short fade.
- The embroidery drifts into place as you scroll, in browsers that support
  scroll-driven animation. Anything fully on screen is always fully visible.
- The countdown switches to "Today's the day" once the ceremony time arrives.
