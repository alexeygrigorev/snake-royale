import type { GameState } from "@/lib/snake/engine";
import { cn } from "@/lib/utils";

export type BoardVisualMode = "current" | "nokia";

interface Props {
  state: Pick<GameState, "width" | "height" | "snake" | "food" | "alive">;
  cell?: number;
  visualMode?: BoardVisualMode;
}

export function SnakeBoard({ state, cell = 20, visualMode = "current" }: Props) {
  const effectiveCell = visualMode === "nokia" ? 15 : cell;
  const board = <BoardSvg state={state} cell={effectiveCell} visualMode={visualMode} />;

  if (visualMode === "nokia") {
    return (
      <div className="nokia-phone" aria-label="old Nokia phone visual mode">
        <div className="nokia-speaker" />
        <div className="nokia-brand">NOKIA</div>
        <div className="nokia-screen">
          <div className="nokia-screen-status">
            <span>SNAKE II</span>
            <span>{state.alive ? "READY" : "ENDED"}</span>
          </div>
          {board}
        </div>
        <div className="nokia-keypad" aria-hidden="true">
          <div className="nokia-softkeys">
            <span />
            <span />
          </div>
          <div className="nokia-dpad">
            <span />
          </div>
          <div className="nokia-number-pad">
            {[
              "1",
              "2 ABC",
              "3 DEF",
              "4 GHI",
              "5 JKL",
              "6 MNO",
              "7 PQRS",
              "8 TUV",
              "9 WXYZ",
              "*",
              "0",
              "#",
            ].map((key) => (
              <span key={key}>{key}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return board;
}

function BoardSvg({
  state,
  cell,
  visualMode,
}: {
  state: Pick<GameState, "width" | "height" | "snake" | "food" | "alive">;
  cell: number;
  visualMode: BoardVisualMode;
}) {
  const w = state.width * cell;
  const h = state.height * cell;
  const headKey = state.snake[0] ? `${state.snake[0].x},${state.snake[0].y}` : "";
  const bodySet = new Set(state.snake.slice(1).map((p) => `${p.x},${p.y}`));
  const isNokia = visualMode === "nokia";
  const boardFill = isNokia ? "#96a46e" : "var(--color-card)";
  const headFill = isNokia ? "#13210f" : "var(--color-primary)";
  const bodyFill = isNokia ? "#22351a" : "var(--color-accent-foreground)";
  const foodFill = isNokia ? "#0d190a" : "var(--color-destructive)";
  const gameOverFill = isNokia ? "#13210f" : "var(--color-destructive)";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn(
        "h-auto max-w-full",
        isNokia ? "nokia-board" : "rounded-lg border border-border bg-card shadow-sm",
      )}
      role="img"
      aria-label="snake board"
    >
      <rect width={w} height={h} fill={boardFill} />
      {isNokia &&
        Array.from({ length: state.width + 1 }).map((_, x) => (
          <line
            key={`x-${x}`}
            x1={x * cell}
            y1={0}
            x2={x * cell}
            y2={h}
            stroke="#7d8d5c"
            strokeWidth="1"
            opacity="0.35"
          />
        ))}
      {isNokia &&
        Array.from({ length: state.height + 1 }).map((_, y) => (
          <line
            key={`y-${y}`}
            x1={0}
            y1={y * cell}
            x2={w}
            y2={y * cell}
            stroke="#7d8d5c"
            strokeWidth="1"
            opacity="0.35"
          />
        ))}
      {Array.from({ length: state.height }).map((_, y) =>
        Array.from({ length: state.width }).map((_, x) => {
          const key = `${x},${y}`;
          let fill = "transparent";
          if (key === headKey) fill = headFill;
          else if (bodySet.has(key)) fill = bodyFill;
          else if (state.food.x === x && state.food.y === y) fill = foodFill;
          if (fill === "transparent") return null;
          return (
            <rect
              key={key}
              x={x * cell + (isNokia ? 2 : 1)}
              y={y * cell + (isNokia ? 2 : 1)}
              width={cell - (isNokia ? 4 : 2)}
              height={cell - (isNokia ? 4 : 2)}
              rx={isNokia ? 0 : 3}
              fill={fill}
            />
          );
        }),
      )}
      {!state.alive && (
        <text
          x={w / 2}
          y={h / 2}
          textAnchor="middle"
          fill={gameOverFill}
          fontSize={isNokia ? "18" : "20"}
          fontWeight="700"
          fontFamily={isNokia ? "monospace" : undefined}
        >
          Game Over
        </text>
      )}
    </svg>
  );
}
