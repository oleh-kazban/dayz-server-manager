import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Check, Clock, Copy, Globe, RefreshCw, Square, Terminal, Users } from 'lucide-react';

import { Button } from '../button';
import { StatusTag } from '../status-tag';

import { HeroBanner } from './HeroBanner';

const meta: Meta<typeof HeroBanner> = {
  title: 'Components/HeroBanner',
  component: HeroBanner,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    backgroundImage: {
      control: 'text',
      description: 'URL of the background wallpaper',
    },
    scrimClassName: {
      control: 'text',
      description: 'Custom overlay scrim class overrides',
    },
    as: {
      control: 'select',
      options: ['div', 'section', 'article', 'header'],
      description: 'Semantic container HTML element',
    },
  },
};

export default meta;

type Story = StoryObj<typeof HeroBanner>;

export const ServerHero: Story = {
  render: () => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="max-w-5xl mx-auto w-full">
        <HeroBanner backgroundImage="/assets/images/misty-chernarus-bg.jpg">
          <HeroBanner.Top>
            <HeroBanner.Header>
              <HeroBanner.Eyebrow>
                <span>DAYZ / DEDICATED SERVER</span>
                <StatusTag status="online">Online</StatusTag>
              </HeroBanner.Eyebrow>
              <HeroBanner.Title>Chernarus Survival</HeroBanner.Title>
              <HeroBanner.Description>
                Outlive Project · 1PP · Vanilla+ · No safe zones
              </HeroBanner.Description>
            </HeroBanner.Header>

            <HeroBanner.Aside>
              <Globe aria-hidden="true" className="w-3.5 h-3.5 text-slate-300" />
              <span>Frankfurt, DE</span>
            </HeroBanner.Aside>
          </HeroBanner.Top>

          <HeroBanner.Bottom>
            <HeroBanner.Meta>
              <div className="flex items-center gap-1.5 font-mono">
                <span>185.38.151.42:2302</span>
                <button
                  type="button"
                  aria-label="Copy server address"
                  onClick={handleCopy}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <Check aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                <span>Uptime 6d 14h 32m</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                <span>48 / 60 players</span>
              </div>

              <span className="text-slate-400">DayZ 1.26</span>
            </HeroBanner.Meta>

            <HeroBanner.Actions>
              <Button
                variant="secondary"
                leftIcon={<Terminal aria-hidden="true" className="w-3.5 h-3.5" />}
              >
                Console
              </Button>
              <Button
                variant="secondary"
                leftIcon={<RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />}
              >
                Restart
              </Button>
              <Button
                variant="secondary"
                destructive
                leftIcon={<Square aria-hidden="true" className="w-3.5 h-3.5" />}
              >
                Stop
              </Button>
            </HeroBanner.Actions>
          </HeroBanner.Bottom>
        </HeroBanner>
      </div>
    );
  },
};

export const SectionVoiceHero: Story = {
  render: () => (
    <div className="max-w-5xl mx-auto w-full">
      <HeroBanner backgroundImage="/assets/images/misty-chernarus-bg.jpg">
        <HeroBanner.Top>
          <HeroBanner.Header>
            <HeroBanner.Eyebrow>
              <span>CONTROL PLANE</span>
            </HeroBanner.Eyebrow>
            <HeroBanner.Title>Every world needs someone who stays.</HeroBanner.Title>
            <HeroBanner.Description>
              A restrained, observant overview of server health, resource telemetry, and player
              activity.
            </HeroBanner.Description>
          </HeroBanner.Header>
        </HeroBanner.Top>
      </HeroBanner>
    </div>
  ),
};

export const OfflineServerHero: Story = {
  render: () => (
    <div className="max-w-5xl mx-auto w-full">
      <HeroBanner backgroundImage="/assets/images/misty-chernarus-bg.jpg">
        <HeroBanner.Top>
          <HeroBanner.Header>
            <HeroBanner.Eyebrow>
              <span>DAYZ / DEDICATED SERVER</span>
              <StatusTag status="offline">Offline</StatusTag>
            </HeroBanner.Eyebrow>
            <HeroBanner.Title>Chernarus Survival [US-East]</HeroBanner.Title>
            <HeroBanner.Description>
              Server process stopped · BattlEye persistence saved · Ready to start
            </HeroBanner.Description>
          </HeroBanner.Header>

          <HeroBanner.Aside>
            <Globe aria-hidden="true" className="w-3.5 h-3.5 text-slate-300" />
            <span>New York, US</span>
          </HeroBanner.Aside>
        </HeroBanner.Top>

        <HeroBanner.Bottom>
          <HeroBanner.Meta>
            <span className="font-mono text-slate-400">198.51.100.24:2302</span>
            <span className="text-slate-400">DayZ 1.26</span>
          </HeroBanner.Meta>

          <HeroBanner.Actions>
            <Button variant="primary">Start Server</Button>
          </HeroBanner.Actions>
        </HeroBanner.Bottom>
      </HeroBanner>
    </div>
  ),
};

export const DirectPropsUsage: Story = {
  render: () => (
    <div className="max-w-5xl mx-auto w-full">
      <HeroBanner
        backgroundImage="/assets/images/misty-chernarus-bg.jpg"
        eyebrow={
          <>
            <span>CENTRAL ECONOMY</span>
            <span className="text-amber-400 font-medium">types.xml</span>
          </>
        }
        title="Central Economy & Loot Table Editor"
        subtitle="Manage 20,000+ item spawn entries, nominal limits, lifetime values, and category tier assignments."
        aside={
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-300">File version 1.26.158</span>
          </div>
        }
        meta={<span className="text-xs text-slate-300">Last synced 5 minutes ago</span>}
        actions={<Button variant="primary">Save Changes</Button>}
      />
    </div>
  ),
};

export const MinimalNoImage: Story = {
  render: () => (
    <div className="max-w-5xl mx-auto w-full">
      <HeroBanner
        eyebrow={<span>PLAYER DIRECTORY</span>}
        title="Survivor Registry"
        subtitle="Historical survivor sessions, GUID cross-reference, and permission management."
      />
    </div>
  ),
};
