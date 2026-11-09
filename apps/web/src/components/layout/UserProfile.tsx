import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';

import { useAuth, type UserRole } from '@aegis/web/features/auth';

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

  // Derive initials from displayName or username (e.g., "Alex Kovac" -> "AK", "Administrator" -> "AD")
  const displayName = user?.displayName || user?.username || 'Administrator';
  const displayRole = user?.role ? ROLE_LABELS[user.role] : 'Administrator';
  const parts = displayName
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials =
    (parts.length > 1 ? parts[0][0] + parts[1][0] : displayName.slice(0, 2)).toUpperCase() || 'AD';

  return (
    <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]">
      <Link
        to="/profile"
        title="View profile & preferences"
        className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition-opacity"
      >
        <div className="w-[30px] h-[30px] rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
          {initials}
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)] truncate">{displayRole}</span>
        </div>
      </Link>
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
