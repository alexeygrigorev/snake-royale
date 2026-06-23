import type { GameState } from "@/lib/snake/engine";

interface Props {
  state: Pick<GameState, "width" | "height" | "snake" | "food" | "alive">;
  cell?: number;
}

export function SnakeBoard({ state, cell = 20 }: Props) {
  const w = state.width * cell;
  const h = state.height * cell;
  const headKey = state.snake[0] ? `${state.snake[0].x},${state.snake[0].y}` : "";
  const bodySet = new Set(state.snake.slice(1).map((p) => `${p.x},${p.y}`));

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="rounded-lg border border-border bg-card shadow-sm"
      role="img"
      aria-label="snake board"
    >
      <rect width={w} height={h} fill="var(--color-card)" />
      {Array.from({ length: state.height }).map((_, y) =>
        Array.from({ length: state.width }).map((_, x) => {
          const key = `${x},${y}`;
          let fill = "transparent";
          if (key === headKey) fill = "var(--color-primary)";
          else if (bodySet.has(key)) fill = "var(--color-accent-foreground)";
          else if (state.food.x === x && state.food.y === y)
            fill = "var(--color-destructive)";
          if (fill === "transparent") return null;
          return (
            <rect
              key={key}
              x={x * cell + 1}
              y={y * cell + 1}
              width={cell - 2}
              height={cell - 2}
              rx={3}
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
          fill="var(--color-destructive)"
          fontSize="20"
          fontWeight="700"
        >
          Game Over
        </text>
      )}
    </svg>
  );
}