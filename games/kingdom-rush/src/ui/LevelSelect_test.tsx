import { assert, assertStringIncludes } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { LEVELS } from "../content/levels.ts";
import { emptyProgress } from "../runtime/progress.ts";
import { createSession, type View, viewOf } from "../runtime/session.ts";
import { LevelSelect } from "./LevelSelect.tsx";

const noop = () => {};

function view(won: Record<string, true> = {}): View {
  const session = createSession();
  session.progress = { ...emptyProgress(), won };
  return viewOf(session);
}

/** Split the rendered list into one chunk per stage card. */
function stageRows(html: string): string[] {
  return html.split('<li class="level">').slice(1);
}

function rowFor(html: string, levelId: number): string {
  const row = stageRows(html).find((part) =>
    part.includes(`<h2>Level ${levelId}</h2>`)
  );
  assert(row, `no card for level ${levelId}`);
  return row;
}

function modeButton(row: string, name: string): string {
  const button = row.split("<button").find((part) =>
    part.includes(`<span>${name}</span>`)
  );
  assert(button, `no ${name} button in this card`);
  return button;
}

Deno.test("the picker lists every stage", () => {
  const html = renderToStaticMarkup(
    <LevelSelect view={view()} onPlay={noop} onDifficulty={noop} />,
  );
  assertStringIncludes(html, "Kingdom Rush");
  assertStringIncludes(html, "0 / 51 challenges cleared");
  const rows = stageRows(html);
  assert(rows.length === LEVELS.length, "one card per stage");
  for (const level of LEVELS) {
    assertStringIncludes(
      html,
      `<h2>Level ${level.id}</h2>`,
    );
  }
  // Stage names are absent from the source, and the footer says so.
  assertStringIncludes(html, "Stage names are missing");
});

Deno.test("later stages and heroic modes start locked", () => {
  const html = renderToStaticMarkup(
    <LevelSelect view={view()} onPlay={noop} onDifficulty={noop} />,
  );
  const first = rowFor(html, 1);
  const campaign = modeButton(first, "Campaign");
  assertStringIncludes(campaign, 'data-open="true"');
  assert(!campaign.includes("disabled"), "campaign 1 is playable");

  const heroic = modeButton(first, "Heroic");
  assertStringIncludes(heroic, 'data-open="false"');
  assertStringIncludes(heroic, "disabled");

  const second = rowFor(html, 2);
  for (const name of ["Campaign", "Heroic", "Iron"]) {
    assertStringIncludes(modeButton(second, name), 'data-open="false"');
  }
});

Deno.test("cleared modes are checked and unlock the next ones", () => {
  const html = renderToStaticMarkup(
    <LevelSelect
      view={view({ "1:campaign": true, "1:heroic": true })}
      onPlay={noop}
      onDifficulty={noop}
    />,
  );
  const first = rowFor(html, 1);
  const campaign = modeButton(first, "Campaign");
  assertStringIncludes(campaign, 'data-done="true"');
  const heroic = modeButton(first, "Heroic");
  assertStringIncludes(heroic, 'data-done="true"');

  const iron = modeButton(first, "Iron");
  assertStringIncludes(iron, 'data-open="true"');
  assert(!iron.includes("disabled"));

  // Clearing level 1's campaign opens level 2's campaign but not heroic.
  const second = rowFor(html, 2);
  assertStringIncludes(modeButton(second, "Campaign"), 'data-open="true"');
  assertStringIncludes(modeButton(second, "Heroic"), 'data-open="false"');
  assertStringIncludes(html, "2 / 51 challenges cleared");
});

Deno.test("the difficulty selector marks the chosen difficulty", () => {
  const html = renderToStaticMarkup(
    <LevelSelect view={view()} onPlay={noop} onDifficulty={noop} />,
  );
  const normal = html.split("<button").find((part) =>
    part.includes(">normal</button>")
  );
  assert(normal, "the normal difficulty button must exist");
  assertStringIncludes(normal, 'data-active="true"');
  assertStringIncludes(html, "The original balance.");
});
