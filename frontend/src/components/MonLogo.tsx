/** Family-crest style mark: crescent moon inside a ring. */
export default function MonLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#e3b04b" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10" fill="#f1dca6" />
      <circle cx="20.5" cy="13" r="9" fill="#0b0a10" />
      <circle cx="9" cy="22" r="1.3" fill="#e2452f" />
    </svg>
  );
}
