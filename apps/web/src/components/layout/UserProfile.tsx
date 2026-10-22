import { useNavigate, useRouter } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';

import { useAuth, type UserRole } from '@dsm/features/auth';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  moderator: 'Moderator',
  viewer: 'Viewer',
};

export function UserProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  const handleLogout = async () => {
    logout();
    await router.invalidate();
    await navigate({ to: '/sign-in' });
  };

  // Derive initials from username (e.g., "Alex Kovac" -> "AK", "admin" -> "AD")
  const displayName = user?.username ?? 'Administrator';
  const displayRole = user?.role ? ROLE_LABELS[user.role] : 'Administrator';
  const initials =
    displayName
      .split(/[\s._-]+/)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'AD';

  return (
    <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] truncate">{displayRole}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        aria-label="Sign out"
        title="Sign out"
        className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] rounded transition-colors cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
