// Stage picker. Stages are numbered rather than named: the original game's
// locale files are not part of the SWF, so the data has no stage titles.
import { LEVELS } from "../content/levels.ts";
import type { GameMode } from "../game/types.ts";
import { countWaveGroups } from "../game/waves.ts";
import { cleared, unlocked } from "../runtime/progress.ts";
import type { View } from "../runtime/session.ts";
import type { Difficulty } from "../game/types.ts";
import { Icon } from "./icons.tsx";

interface Props {
  view: View;
  onPlay(levelId: number, mode: GameMode): void;
  onDifficulty(difficulty: Difficulty): void;
}

const MODES: readonly GameMode[] = ["campaign", "heroic", "iron"];

const MODE_NAMES: Record<GameMode, string> = {
  campaign: "Campaign",
  heroic: "Heroic",
  iron: "Iron",
};

const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
  easy: "Enemies 20% weaker, soldiers 20% tougher.",
  normal: "The original balance.",
  hard: "Enemies 20% tougher, soldiers unchanged.",
};

export function LevelSelect({ view, onPlay, onDifficulty }: Props) {
  const progress = view.progress;
  const total = LEVELS.length * MODES.length;
  let done = 0;
  for (const level of LEVELS) {
    for (const mode of MODES) {
      if (cleared(progress, level.id, mode)) done++;
    }
  }

  return (
    <div className="select">
      <header className="select-head">
        <div className="brand">
          <h1>Kingdom Rush</h1>
          <p>
            Defend the road with archers, mages, artillery and soldiers. Every
            stage below is the original layout and wave list.
          </p>
        </div>
        <div className="difficulty">
          <span className="difficulty-label">Difficulty</span>
          <div className="segmented">
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                data-active={view.difficulty === difficulty}
                onClick={() => onDifficulty(difficulty)}
              >
                {difficulty}
              </button>
            ))}
          </div>
          <small>{DIFFICULTY_HINTS[view.difficulty]}</small>
        </div>
      </header>

      <div className="progress-line">
        <span>{done} / {total} challenges cleared</span>
        <span className="rule" />
        <span>Heroic needs the campaign; Iron needs Heroic.</span>
      </div>

      <ol className="levels">
        {LEVELS.map((level) => {
          const campaign = level.modes.campaign;
          const waves = countWaveGroups(campaign.waves);
          return (
            <li className="level" key={level.id}>
              <div
                className="level-art"
                data-block={Math.min(5, Math.floor((level.id - 1) / 3))}
              >
                <span>{level.id}</span>
              </div>
              <div className="level-body">
                <h2>Level {level.id}</h2>
                <p className="level-meta">
                  {campaign.lives} lives · {campaign.towers.length} slots ·{" "}
                  {waves} waves
                </p>
                <div className="modes">
                  {MODES.map((mode) => {
                    const open = unlocked(progress, level.id, mode);
                    const beaten = cleared(progress, level.id, mode);
                    const data = level.modes[mode];
                    return (
                      <button
                        key={mode}
                        type="button"
                        className="mode"
                        data-done={beaten}
                        data-open={open}
                        disabled={!open}
                        onClick={() => onPlay(level.id, mode)}
                        title={open
                          ? `${MODE_NAMES[mode]}: ${
                            countWaveGroups(data.waves)
                          } waves`
                          : `${MODE_NAMES[mode]} is locked`}
                      >
                        {beaten
                          ? <Icon name="check" size={12} />
                          : !open
                          ? <Icon name="lock" size={11} />
                          : null}
                        <span>{MODE_NAMES[mode]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="select-foot">
        <p>
          Stage names are missing from the extracted data, so stages are
          numbered. Tower specializations change stats only; their special
          abilities are not implemented.
        </p>
      </footer>
    </div>
  );
}
