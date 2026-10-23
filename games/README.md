# Games

Each game is a self-contained static folder:

```
games/<slug>/index.html   # entry point, served at /games/<slug>/
games/<slug>/...          # any scripts, styles, sprites, or sounds it needs
```

To add a game:

1. Add an entry to `games.ts` at the project root with a matching `slug`.
2. Create `games/<slug>/index.html`.

Until `index.html` exists, the game's card links to a "Coming soon" page. Once
it exists, the card shows a **Play** badge. Use relative paths for assets (e.g.
`./game.js`) so they resolve inside the game's folder.
