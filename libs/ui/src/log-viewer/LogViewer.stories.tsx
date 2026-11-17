import { useEffect, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { LogViewer } from './LogViewer';

const meta: Meta<typeof LogViewer> = {
  title: 'Data/LogViewer',
  component: LogViewer,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LogViewer>;

const sample = [
  '21:00:00.012 Mission read.',
  '21:00:00.418 Warning: No components in rag_basebuilding\\models\\stairs\\proxies\\book_holo_stairs.p3d:geometryFire',
  '21:00:00.420 Convex "component11" selection faces are less then 4 in rag_basebuilding\\models\\stairs\\proxies\\book_holo_stairs.p3d:geometryFire',
  '21:00:01.002 Error: Script compilation failed: unknown type "ItemBase2" in 4_World/classes/expansion.c',
  'SCRIPT    (E): NULL pointer to instance',
  '21:00:01.500 Player "Survivor" (id=abc123) has connected.',
];

export const Default: Story = {
  args: { lines: sample, label: 'RPT log', height: 240 },
};

export const LargeFile: Story = {
  name: '100k lines',
  args: {
    label: 'RPT log',
    firstLineNumber: 349_001,
    lines: Array.from(
      { length: 100_000 },
      (_, i) =>
        `21:${String(Math.floor(i / 3600) % 60).padStart(2, '0')}:${String(Math.floor(i / 60) % 60).padStart(2, '0')}.${String(i % 1000).padStart(3, '0')} ${
          i % 17 === 0 ? 'Warning: No components in model.p3d' : `Loading object ${i}`
        }`,
    ),
  },
};

export const Empty: Story = {
  args: { lines: [], emptyMessage: 'Waiting for the server to write its log…', height: 160 },
};

function LiveDemo() {
  const [lines, setLines] = useState<string[]>(sample);
  useEffect(() => {
    const timer = setInterval(() => {
      setLines(current => [
        ...current,
        `21:01:${String(current.length % 60).padStart(2, '0')}.000 ${
          current.length % 9 === 0 ? 'Warning: low server FPS' : `Tick ${current.length}`
        }`,
      ]);
    }, 400);
    return () => clearInterval(timer);
  }, []);
  return <LogViewer lines={lines} label="Live RPT log" height={300} />;
}

export const Live: Story = {
  name: 'Live (scroll up to pause)',
  render: () => <LiveDemo />,
};
