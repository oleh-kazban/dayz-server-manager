import { PageContainer } from '@dsm/web/components';

import { useProfileQuery } from '../api/profile.queries';
import { ActiveSessionsCard } from '../components/ActiveSessionsCard';
import { PasswordRotationCard } from '../components/PasswordRotationCard';
import { ProfileIdentityCard } from '../components/ProfileIdentityCard';
import { ThemeSelectorCard } from '../components/ThemeSelectorCard';

export function ProfileView() {
  const { data: profile, isLoading } = useProfileQuery();

  return (
    <PageContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">
            Operator Profile & Preferences
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure operator identity, regional temporal formatting, client theme, and stateful
            active sessions.
          </p>
        </div>

        <ProfileIdentityCard
          key={profile?.id ?? 'loading'}
          profile={profile}
          isLoading={isLoading}
        />
        <ThemeSelectorCard />
        <PasswordRotationCard />
        <ActiveSessionsCard />
      </div>
    </PageContainer>
  );
}
