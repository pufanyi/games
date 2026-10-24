// Small inline icons for the HUD. Canvas art can't be reused here, and icons
// keep the interface readable at phone width without image assets.
export type IconName =
  | "heart"
  | "coin"
  | "flag"
  | "bolt"
  | "meteor"
  | "shield"
  | "pause"
  | "play"
  | "check"
  | "lock";

const PATHS: Record<Exclude<IconName, "meteor">, string> = {
  heart:
    "M12 21s-7.2-4.6-9.5-8.3C.3 9.3 2 5 6.2 5c2 0 3.3 1.1 4 2.1C11 6.1 12.3 5 14.3 5c4.2 0 5.9 4.3 3.7 7.7C19.2 16.4 12 21 12 21z",
  coin:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z",
  flag: "M6 2h2v20H6V2zm3 1h9l-2.2 4L18 11H9V3z",
  bolt: "M13.5 2 4.5 14h5.2L9 22l9-12h-5.4l.9-8z",
  shield:
    "M12 2 4.5 5.5v6.2C4.5 16.6 12 22 12 22s7.5-5.4 7.5-10.3V5.5L12 2zm0 2.3 5.5 2.6v5C17.5 15.2 13.8 18.6 12 19.8c-1.8-1.2-5.5-4.6-5.5-7.9v-5L12 4.3z",
  pause: "M7 4h3.5v16H7V4zm6.5 0H17v16h-3.5V4z",
  play: "M8 4.5 19 12 8 19.5v-15z",
  check: "M20.3 6.3 9.5 17.1l-5.8-5.8 2.1-2.1 3.7 3.7 8.7-8.7 2.1 2.1z",
  lock:
    "M12 2a5 5 0 0 0-5 5v3H5.5v12h13V10H17V7a5 5 0 0 0-5-5zm0 2.2A2.8 2.8 0 0 1 14.8 7v3H9.2V7A2.8 2.8 0 0 1 12 4.2z",
};

export function Icon(
  { name, size = 16, className }: {
    name: IconName;
    size?: number;
    className?: string;
  },
) {
  if (name === "meteor") {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="14" cy="13" r="6" fill="currentColor" />
        <path
          d="M9 8 3 3l6 9 3-2z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  );
}
