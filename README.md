# Wiki Speedrun

Navigate from one Wikipedia article to another using only links — race the clock!

**[Play now](https://raggedr.github.io/wiki-speedrun/)**

## How to play

1. Choose a start and target article (or hit **Random Challenge**)
2. Read the article and click wiki links to navigate toward your target
3. Reach the target in as few clicks as possible

## Features

- **Autocomplete search** — find any Wikipedia article
- **Random challenges** — curated from ~300 well-known topics
- **Breadcrumb trail** — click to backtrack (costs a click)
- **"Getting warmer"** — indicator when the current page links directly to the target
- **Peek** — preview the target article (read-only)
- **Run history** — past runs saved in localStorage

## Development

```bash
npm install
npm run serve        # http://localhost:8080
npm test             # Playwright tests
```

Single `index.html` with inline CSS + JS. No build step.
