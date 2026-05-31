interface MobileIconProps {
  className?: string;
}

export function BackpackIcon({ className }: MobileIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 7V6a4 4 0 0 1 8 0v1h2a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2h2zm2-1a2 2 0 0 1 4 0v1h-4V6zm-1 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"
      />
    </svg>
  );
}

export function EmoteIcon({ className }: MobileIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-3.5 7.25a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm7 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM8.2 15.2c.95 1.45 2.45 2.3 3.8 2.3s2.85-.85 3.8-2.3a.75.75 0 1 0-1.24-.85c-.7 1.05-1.75 1.65-2.56 1.65-.81 0-1.86-.6-2.56-1.65a.75.75 0 1 0-1.24.85z"
      />
    </svg>
  );
}

export function TextEntryIcon({ className }: MobileIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v8.5A2.75 2.75 0 0 1 17.25 17H9.6l-3.73 2.48A1 1 0 0 1 5 18.63V17h-.25A2.75 2.75 0 0 1 2 14.25v-8.5zM6.75 5.5c-.69 0-1.25.56-1.25 1.25v8.5c0 .69.56 1.25 1.25 1.25H6.5a1 1 0 0 1 1 1v1.42l2.55-1.7a1 1 0 0 1 .55-.17h6.65c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H6.75z"
      />
    </svg>
  );
}

export function ChatIcon({ className }: MobileIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4.5A2.5 2.5 0 0 1 6.5 2h11A2.5 2.5 0 0 1 20 4.5v8A2.5 2.5 0 0 1 17.5 15H9.7L5.2 18.25A1 1 0 0 1 4 17.47V15H6.5A2.5 2.5 0 0 1 4 12.5v-8z"
      />
    </svg>
  );
}
