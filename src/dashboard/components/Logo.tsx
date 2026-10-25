export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={small ? 24 : 28} height={small ? 24 : 28} viewBox="0 0 64 64">
        <rect width="64" height="64" rx="15" fill="#2747d6" />
        <circle cx="16" cy="47" r="4" fill="#fff" />
        <circle cx="25" cy="38" r="4" fill="#fff" />
        <circle cx="31" cy="27" r="4" fill="#fff" />
        <rect x="36" y="11" width="17" height="17" rx="4.5" fill="#f0a63a" />
      </svg>
      <span className={`font-display font-semibold tracking-tight ${small ? 'text-base' : 'text-lg'}`}>RevTrail</span>
    </div>
  );
}

/** Credit line under every page. */
export function Footer() {
  return (
    <footer className="pb-8 pt-2 text-center text-xs text-stone-400">
      RevTrail by{' '}
      <a href="https://deskworthy.app?ref=revtrail" target="_blank" rel="noopener" className="font-medium text-stone-500 hover:text-ink">
        Deskworthy
      </a>
    </footer>
  );
}
