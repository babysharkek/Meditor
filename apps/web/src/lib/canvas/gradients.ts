interface ColorStop {
  color: string;
  position?: number;
}

interface LinearGradientConfig {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  colors: string[];
}

interface RadialGradientConfig {
  cx: number;
  cy: number;
  r: number;
  colors: string[];
}

function splitBackgroundLayers({ input }: { input: string }): string[] {
  const layers: string[] = [];
  let depth = 0;
  let start = 0;

  for (const [index, char] of [...input].entries()) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
    } else if (char === "," && depth === 0) {
      layers.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }

  layers.push(input.slice(start).trim());
  return layers;
}

function parseColorStop({ stop }: { stop: string }): ColorStop {
  const trimmed = stop.trim();
  const colorFunctions = ["rgba(", "rgb(", "hsla(", "hsl("];

  let color = "";
  let remaining = "";

  for (const fn of colorFunctions) {
    if (trimmed.startsWith(fn)) {
      let depth = 0;
      for (const [index, char] of [...trimmed].entries()) {
        if (char === "(") {
          depth += 1;
        } else if (char === ")") {
          depth -= 1;
          if (depth === 0) {
            color = trimmed.slice(0, index + 1);
            remaining = trimmed.slice(index + 1).trim();
            break;
          }
        }
      }
      break;
    }
  }

  if (!color) {
    const parts = trimmed.split(/\s+/);
    color = parts[0] ?? "";
    remaining = parts.slice(1).join(" ");
  }

  if (color === "transparent") {
    color = "rgba(255, 255, 255, 0)";
  }

  const posMatch = remaining.match(/(\d+(?:\.\d+)?)%/);
  const position = posMatch ? parseFloat(posMatch[1]) / 100 : undefined;

  return { color, position };
}

function parseLinearGradient({
  layer,
  width,
  height,
}: {
  layer: string;
  width: number;
  height: number;
}): LinearGradientConfig {
  const inside = layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")"));
  const parts = splitBackgroundLayers({ input: inside });
  const dir = (parts.shift() ?? "").trim();

  let x0 = 0;
  let y0 = 0;
  let x1 = width;
  let y1 = 0;

  if (dir.endsWith("deg")) {
    const deg = parseFloat(dir);
    const rad = (deg * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.hypot(width, height) / 2;
    x0 = cx - Math.cos(rad) * r;
    y0 = cy - Math.sin(rad) * r;
    x1 = cx + Math.cos(rad) * r;
    y1 = cy + Math.sin(rad) * r;
  } else if (dir.startsWith("to ")) {
    const direction = dir.slice(3).trim();
    const directionMap = {
      right: { x0: 0, y0: 0, x1: width, y1: 0 },
      left: { x0: width, y0: 0, x1: 0, y1: 0 },
      bottom: { x0: 0, y0: 0, x1: 0, y1: height },
      top: { x0: 0, y0: height, x1: 0, y1: 0 },
    };

    const mapped = directionMap[direction as keyof typeof directionMap];
    if (mapped) {
      x0 = mapped.x0;
      y0 = mapped.y0;
      x1 = mapped.x1;
      y1 = mapped.y1;
    }
  } else {
    parts.unshift(dir);
  }

  return { x0, y0, x1, y1, colors: parts };
}

function parseRadialGradient({
  layer,
  width,
  height,
}: {
  layer: string;
  width: number;
  height: number;
}): RadialGradientConfig {
  const inside = layer.slice(layer.indexOf("(") + 1, layer.lastIndexOf(")"));
  const parts = splitBackgroundLayers({ input: inside });
  const first = (parts.shift() ?? "").trim();

  let cx = width / 2;
  let cy = height / 2;

  if (first.startsWith("circle at")) {
    const pos = first.replace("circle at", "").trim();
    const coords = pos.split(/\s+/);

    for (const [index, coord] of coords.entries()) {
      if (coord.endsWith("%")) {
        const val = parseFloat(coord) / 100;
        if (index === 0) cx = val * width;
        else if (index === 1) cy = val * height;
      } else if (coord === "left") {
        cx = 0;
      } else if (coord === "right") {
        cx = width;
      } else if (coord === "top") {
        cy = 0;
      } else if (coord === "bottom") {
        cy = height;
      } else if (coord === "center") {
        if (index === 0) cx = width / 2;
        else if (index === 1) cy = height / 2;
      }
    }
  } else {
    parts.unshift(first);
  }

  const r = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(width - cx, cy),
    Math.hypot(cx, height - cy),
    Math.hypot(width - cx, height - cy),
  );

  return { cx, cy, r, colors: parts };
}

function createGradientStops({
  colors,
  ctx,
  createGradient,
}: {
  colors: string[];
  ctx: CanvasRenderingContext2D;
  createGradient: () => CanvasGradient;
}): void {
  const gradient = createGradient();
  const colorStops = colors.map((color) =>
    parseColorStop({ stop: color }),
  );

  for (const [index, stop] of colorStops.entries()) {
    const position =
      stop.position ?? index / Math.max(1, colorStops.length - 1);
    gradient.addColorStop(Math.max(0, Math.min(1, position)), stop.color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

export function drawCssBackground({
  ctx,
  width,
  height,
  css,
}: {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  css: string;
}): void {
  const layers = splitBackgroundLayers({ input: css }).filter(Boolean);

  for (let i = layers.length - 1; i >= 0; i -= 1) {
    const layer = layers[i] ?? "";

    if (layer.startsWith("linear-gradient(")) {
      const { x0, y0, x1, y1, colors } = parseLinearGradient({
        layer,
        width,
        height,
      });

      createGradientStops({
        colors,
        ctx,
        createGradient: () => ctx.createLinearGradient(x0, y0, x1, y1),
      });
    } else if (layer.startsWith("radial-gradient(")) {
      const { cx, cy, r, colors } = parseRadialGradient({
        layer,
        width,
        height,
      });

      createGradientStops({
        colors,
        ctx,
        createGradient: () => ctx.createRadialGradient(cx, cy, 0, cx, cy, r),
      });
    } else if (
      layer.startsWith("#") ||
      layer.startsWith("rgb") ||
      layer.startsWith("hsl") ||
      layer === "transparent" ||
      layer === "white" ||
      layer === "black"
    ) {
      if (layer !== "transparent") {
        ctx.fillStyle = layer;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }
}
