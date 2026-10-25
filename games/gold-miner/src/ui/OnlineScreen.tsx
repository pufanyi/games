import { type FormEvent, useEffect, useRef, useState } from "react";
import { mySeat, type OnlineView, partnerOf } from "../runtime/online.ts";
import { Panel } from "./screens.tsx";

/**
 * The room before a game: two seats that mirror the two miners, the invite
 * link while the host waits, and one Start button for whoever is ready first.
 */
export function RoomScreen({ online, onStart, onRename, onLeave }: {
  online: OnlineView;
  onStart: () => void;
  onRename: (name: string) => void;
  onLeave: () => void;
}) {
  const startRef = useRef<HTMLButtonElement>(null);
  const partner = partnerOf(online);
  const connected = online.status === "connected";
  const canStart = connected && partner !== null;
  // The Start button appears when a friend arrives; put it under Enter.
  useEffect(() => {
    if (canStart) startRef.current?.focus();
  }, [canStart]);

  if (online.status === "closed") {
    return (
      <Panel label="Room closed" className="room">
        <h2>Room closed</h2>
        <p role="status">{online.error}</p>
        <button type="button" className="button primary" onClick={onLeave}>
          Back to title
        </button>
      </Panel>
    );
  }

  const seat = mySeat(online);
  const waiting = online.role === "host" && !partner;
  return (
    <Panel label="Play with a friend" className="room">
      <h2>Play with a friend</h2>
      <div className="seats">
        {([0, 1] as const).map((i) => {
          const side = i === 0 ? "Left miner" : "Right miner";
          if (i === seat) {
            return (
              <div key={i} className="seat own">
                <NameField name={online.name} onRename={onRename} />
                <span className="seat-note">You · {side}</span>
              </div>
            );
          }
          return partner
            ? (
              <div key={i} className="seat joined">
                <span className="seat-name">{partner}</span>
                <span className="seat-note">Friend · {side}</span>
              </div>
            )
            : (
              <div key={i} className="seat empty">
                <span className="seat-name">
                  {connected ? "Waiting…" : "Connecting…"}
                </span>
                <span className="seat-note">{side}</span>
              </div>
            );
        })}
      </div>
      {waiting && online.link && <Invite link={online.link} />}
      {!waiting && (
        <button
          ref={startRef}
          type="button"
          className="button primary"
          disabled={!canStart}
          onClick={onStart}
        >
          {canStart ? "Start game" : "Connecting…"}
        </button>
      )}
      <button type="button" className="button" onClick={onLeave}>
        Leave
      </button>
    </Panel>
  );
}

/** Your name, edited in place; saved when you press Enter or click away. */
function NameField({ name, onRename }: {
  name: string;
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = () => {
    onRename(draft);
    setDraft(name);
  };
  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        commit();
      }}
    >
      <input
        className="seat-name name-field"
        aria-label="Your name"
        maxLength={20}
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
      />
    </form>
  );
}

function Invite({ link }: { link: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="invite">
      <p>Send your friend this link:</p>
      <input
        ref={inputRef}
        className="invite-link"
        aria-label="Invite link"
        readOnly
        value={link}
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        className="button primary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          } catch {
            inputRef.current?.select();
            setCopied(false);
          }
        }}
      >
        {copied === null
          ? "Copy invite link"
          : copied
          ? "Copied!"
          : "Copy the selected link"}
      </button>
    </div>
  );
}

/** What the pause screen says about the other player. */
export function partnerStatus(online: OnlineView): string {
  const name = online.partner || "Your friend";
  if (online.status !== "connected") return "Connection lost. Reconnecting…";
  if (!partnerOf(online)) return `${name} disconnected. Waiting for them…`;
  if (online.stalled) return `${name} isn't responding. Waiting for them…`;
  return "Either player can resume.";
}

/** A short announcement over the mine, e.g. when your friend joins. */
export function Notice({ online }: { online: OnlineView }) {
  if (!online.notice) return null;
  return (
    <p key={online.notice.id} className="notice" role="status">
      {online.notice.text}
    </p>
  );
}
