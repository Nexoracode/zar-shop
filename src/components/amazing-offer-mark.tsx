type AmazingOfferMarkProps = {
  className?: string;
};

export function AmazingOfferMark({ className = "" }: AmazingOfferMarkProps) {
  return (
    <svg
      viewBox="0 0 148 34"
      role="img"
      aria-label="پیشنهاد شگفت‌انگیز"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="148" height="34" rx="0" fill="color-mix(in srgb, var(--danger) 10%, white)" />
      <text
        x="74"
        y="22"
        direction="rtl"
        unicodeBidi="plaintext"
        textAnchor="middle"
        fontFamily="var(--font-vazir), Vazir, Tahoma, Arial, sans-serif"
        fontSize="15"
        fontWeight="900"
        fill="var(--danger)"
      >
        پیشنهاد شگفت‌انگیز
      </text>
    </svg>
  );
}
