const PALETTES = [
  ["#00D54B", "#38F9D7", "#005C2E"],
  ["#FF375F", "#FF8A80", "#7A1028"],
  ["#5B8CFF", "#00F2FE", "#1B3A8A"],
  ["#F6D365", "#FDA085", "#C2410C"],
  ["#A78BFA", "#F472B6", "#4C1D95"],
  ["#34D399", "#60A5FA", "#065F46"],
  ["#FB7185", "#FBBF24", "#9F1239"],
  ["#22D3EE", "#A78BFA", "#0E7490"],
  ["#F472B6", "#818CF8", "#9D174D"],
  ["#84CC16", "#FDE047", "#3F6212"],
  ["#FB923C", "#F43F5E", "#9A3412"],
  ["#38BDF8", "#C084FC", "#075985"],
] as const;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  const value = seed.toLowerCase();
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function avatarBackground(seed: string): string {
  const hash = hashSeed(seed);
  const [a, b, c] = PALETTES[hash % PALETTES.length];
  const x1 = 18 + (hash % 48);
  const y1 = 12 + ((hash >> 6) % 46);
  const x2 = 52 + ((hash >> 12) % 42);
  const y2 = 48 + ((hash >> 18) % 40);
  const angle = hash % 360;
  const style = hash % 3;

  if (style === 0) {
    return `conic-gradient(from ${angle}deg at ${x1}% ${y1}%, ${a}, ${b}, ${c}, ${a})`;
  }
  if (style === 1) {
    return `linear-gradient(${angle}deg, ${a} 0%, ${b} 48%, ${c} 100%)`;
  }
  return [
    `radial-gradient(circle at ${x1}% ${y1}%, ${a} 0%, transparent 58%)`,
    `radial-gradient(circle at ${x2}% ${y2}%, ${b} 0%, transparent 54%)`,
    `linear-gradient(${angle}deg, ${c}, ${a})`,
  ].join(", ");
}

export default function UserAvatar({
  seed,
  label,
  className = "h-9 w-9",
}: {
  seed: string;
  label?: string;
  className?: string;
}) {
  const name = label ?? seed;

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ background: avatarBackground(seed) }}
      aria-hidden
      title={name}
    />
  );
}
