# BC Parks Bookmarklet Tool

Client-side JavaScript tool for the BC Parks day-use reservation page.

Scope for this version:

- Prime Page 1 fields.
- Display a synchronized BC Parks clock HUD with milliseconds.
- Arm a scheduled Page 1 `Next` click.
- Stop after the Page 1 `Next` click. Page 2 automation is intentionally not included.

## Files

- `dist/park-pass.js` is the file to host publicly.
- `src/` contains the maintainable source layout.
- `index.html` is a small local documentation page.
- `guide/` is the bookmark-ready tutorial page with the favicon, copy button, and runbook.

## Hosting

Host `dist/park-pass.js` on any public static HTTPS host with CORS-friendly JS delivery.

Good options:

- GitHub Pages
- Cloudflare Pages
- A public raw GitHub file

Recommended URL shape:

```text
https://USERNAME.github.io/REPO/park-pass.js
```

or:

```text
https://PROJECT.pages.dev/park-pass.js
```

## Loader Bookmarklet

Use a small loader bookmarklet that fetches the hosted script, cache-busts it during development, and evals it:

```text
javascript:(async()=>{try{const url="https://YOUR_PUBLIC_HOST/park-pass.js?t="+Date.now();const response=await fetch(url,{cache:"no-store"});if(!response.ok){throw new Error(`HTTP ${response.status}`);}const code=await response.text();(0,eval)(code);}catch(error){alert("Park Pass failed:\n\n"+(error.stack||error.message||String(error)));}})();
```

If you edit the hosted file often, keep the `?t=${Date.now()}` cache-buster.

## Tutorial Page

The `guide/` folder is the user-facing setup page.

- Bookmark the guide page in Safari so the favicon appears in your bookmarks list.
- Use the copy button to grab the loader bookmarklet once.
- Follow the runbook on the page to prime, test, and arm from the BC Parks site.

The guide page does not replace the bookmarklet. It is the install and usage reference.

## Local Development

This repository is structured so the source files can be inspected and the bundled file can be updated independently.

The app assumes it is running on the BC Parks reservation page. If you open it elsewhere, Page 1 selectors will not be present and the UI will show an error if you try to prime or arm a booking.

## Behavior Notes

- Booking dates default to two local calendar days from today every time the modal opens.
- Park, pass, and visit-time selections are persisted.
- The clock HUD uses the BC Parks page as its time source when possible and falls back to the local clock if synchronization fails.
- Active armed schedules are not persisted across reloads.

## Current Limitations

- No Page 2 autofill.
- No final submission.
- No aggressive polling or background operation.
- No service workers or multi-tab coordination.
