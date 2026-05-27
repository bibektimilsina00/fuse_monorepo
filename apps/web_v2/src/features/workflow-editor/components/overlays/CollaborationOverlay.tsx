import { useStore } from "reactflow";
import { MousePointer2 } from "lucide-react";
import { useCollaborationStore } from "../../stores/collaborationStore";

/**
 * Deterministically assigns cursor direction per user:
 * sum of first-4 char codes → even = normal left-to-right, odd = mirrored right-to-left.
 * Same user always gets the same direction across all viewers.
 */
function isFlipped(sessionId: string): boolean {
  const sum = sessionId
    .slice(0, 4)
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return sum % 2 === 1;
}

export function CollaborationOverlay() {
  const cursors = useCollaborationStore((s) => s.cursors);
  const getOtherUsers = useCollaborationStore((s) => s.getOtherUsers);

  // ReactFlow viewport transform: [panX, panY, zoom]
  const transform = useStore((s) => s.transform);
  const [vpX, vpY, vpZoom] = transform;

  const otherUsers = getOtherUsers();
  const userToSession = new Map(otherUsers.map((u) => [u.user_id, u]));

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      {Object.entries(cursors).map(([sessionId, cursor]) => {
        const session = [...userToSession.values()].find(
          (s) => s.session_id === sessionId,
        );
        if (!session) return null;

        const screenX = cursor.x * vpZoom + vpX;
        const screenY = cursor.y * vpZoom + vpY;
        const flipped = isFlipped(sessionId);

        return (
          <div
            key={sessionId}
            aria-hidden="true"
            className="absolute will-change-transform"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: "transform 60ms linear",
            }}
          >
            <MousePointer2
              size={20}
              strokeWidth={1.5}
              style={{
                color: session.color,
                fill: session.color,
                filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
                transform: flipped ? "scaleX(-1)" : undefined,
                marginLeft: flipped ? "-20px" : "0",
              }}
            />

            <div
              className="absolute top-[16px] rounded-[4px] px-[6px] py-[2px] text-[11px] font-semibold leading-none text-white shadow-md whitespace-nowrap"
              style={{
                backgroundColor: session.color,
                left: flipped ? "auto" : "14px",
                right: flipped ? "14px" : "auto",
              }}
            >
              {firstName(session.user_name)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/, 1)[0] || "User";
}
