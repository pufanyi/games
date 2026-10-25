import { useState } from "react";
import type { OnlineView } from "../runtime/online.ts";
import { Panel } from "./screens.tsx";

export function OnlineScreen({ online, onReady, onLeave }: {
  online: OnlineView;
  onReady: () => void;
  onLeave: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const mine = online.role === "host" ? 0 : 1;
  const connected = online.status === "connected";
  return (
    <Panel label="Online co-op" className="online-panel">
      <h2>Online co-op</h2>
      <p>Two miners, one goal. Share your money, upgrades and dynamite.</p>
      <p role="status">{online.message}</p>
      {online.status !== "closed" && online.link && (
        <>
          <label className="invite-label" htmlFor="invite-link">
            Invite your partner
          </label>
          <input
            id="invite-link"
            className="invite-link"
            readOnly
            value={online.link}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            className="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(online.link);
                setCopyStatus("Link copied!");
              } catch {
                setCopyStatus(
                  "Select the link above and copy it to invite your partner.",
                );
              }
            }}
          >
            Copy invite link
          </button>
          {copyStatus && <p role="status">{copyStatus}</p>}
          <p>
            You control the {mine === 0 ? "left" : "right"}{" "}
            miner. Both players use ↓ / Space to fire and ↑ for dynamite.
          </p>
          <p>
            {online.peer ? "Partner connected" : "Waiting for partner"} ·{" "}
            {online.ready[1 - mine] ? "Partner ready" : "Partner not ready"}
          </p>
          <button
            type="button"
            className="button primary"
            disabled={!connected || !online.peer || online.ready[mine]}
            onClick={onReady}
          >
            {online.ready[mine]
              ? "Ready — waiting for partner"
              : "Ready to play"}
          </button>
        </>
      )}
      <button type="button" className="button" onClick={onLeave}>
        Leave room
      </button>
    </Panel>
  );
}
