export default function LockIcon({ size = 12, color = "#8e8c87", title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      style={{ flexShrink: 0 }}
    >
      <rect x="4" y="11" width="16" height="10" rx="2" fill={color} stroke="none" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
