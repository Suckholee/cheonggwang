interface Props {
  lines: string[];
}

export function SectionDisclaimer({ lines }: Props) {
  return (
    <p className="mt-3 rounded-2xl bg-[#f7fbff] px-3 py-2 text-[11px] leading-snug text-zinc-500 dark:bg-zinc-900/80">
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}
