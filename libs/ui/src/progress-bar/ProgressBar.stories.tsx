import { useEffect, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';

import { ProgressBar } from './ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'Feedback/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {
  args: {
    label: 'Mission XML Validation',
    value: 65,
    showValue: true,
    containerClassName: 'max-w-md',
  },
};

export const Indeterminate: Story = {
  args: {
    label: 'Synchronizing SteamCMD Workshop Items',
    indeterminate: true,
    helperText: 'Probing Steam workshop API for latest mod delta signatures...',
    containerClassName: 'max-w-md',
  },
};

export const Sizing: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <ProgressBar label="Small Track (4px) — Background Task" size="sm" value={45} showValue />
      <ProgressBar
        label="Medium Track (8px, Default) — Telemetry Gauge"
        size="md"
        value={70}
        showValue
      />
      <ProgressBar label="Large Track (12px) — Major Installation" size="lg" value={85} showValue />
    </div>
  ),
};

export const SeverityVariants: Story = {
  render: () => (
    <div className="space-y-6 max-w-md">
      <ProgressBar label="Host CPU Utilization (Normal)" variant="primary" value={28} showValue />
      <ProgressBar
        label="Physical RAM Consumption (Optimal)"
        variant="success"
        value={42}
        showValue
      />
      <ProgressBar
        label="NVMe Disk Array (High Usage)"
        variant="warning"
        value={84}
        showValue
        helperText="Exceeds 80% watermark. Automatic dump file purge eligible."
      />
      <ProgressBar
        label="Memory Pressure (Critical Threshold)"
        variant="danger"
        value={96}
        showValue
        helperText="OOM killer hazard detected. Dedicated server may restart."
      />
    </div>
  ),
};

export const CustomValueLabel: Story = {
  args: {
    label: 'Mod Download Progress (@Namalsk Survival)',
    value: 3800,
    max: 5000,
    valueLabel: '3.8 GB / 5.0 GB (76%)',
    helperText: 'Estimated remaining time: 42 seconds at 28 MB/s',
    containerClassName: 'max-w-md',
  },
};

export const InteractiveProgressSimulation: Story = {
  render: () => {
    const [progress, setProgress] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
      if (!isRunning) return;

      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsRunning(false);
            return 100;
          }
          return prev + 5;
        });
      }, 250);

      return () => clearInterval(timer);
    }, [isRunning]);

    return (
      <div className="space-y-4 max-w-md">
        <ProgressBar
          label="Simulated types.xml Parsing & Spatial Indexing"
          value={progress}
          showValue
          variant={progress === 100 ? 'success' : 'primary'}
          helperText={`${Math.round((progress / 100) * 22400)} / 22,400 items indexed`}
        />

        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={isRunning || progress === 100}
            onClick={() => setIsRunning(true)}
          >
            Start Scan
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setIsRunning(false);
              setProgress(0);
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  },
};
