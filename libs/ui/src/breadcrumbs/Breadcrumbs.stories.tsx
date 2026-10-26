import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileCode, FileText, Folder, Home, Server, Settings, Slash } from 'lucide-react';

import {
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  Breadcrumbs,
  BreadcrumbSeparator,
} from './Breadcrumbs';
import { type BreadcrumbItemData } from './Breadcrumbs.types';

const DAYZ_ECONOMY_PATH: BreadcrumbItemData[] = [
  { id: 'home', label: 'Dashboard', href: '#dashboard', icon: <Home className="w-3.5 h-3.5" /> },
  { id: 'servers', label: 'Servers', href: '#servers', icon: <Server className="w-3.5 h-3.5" /> },
  { id: 'server', label: 'Outlive Chernarus Plus (EU-01)', href: '#servers/eu-01' },
  {
    id: 'economy',
    label: 'Central Economy',
    href: '#servers/eu-01/economy',
    icon: <Folder className="w-3.5 h-3.5" />,
  },
  { id: 'file', label: 'types.xml', icon: <FileCode className="w-3.5 h-3.5" /> },
];

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Navigation/Breadcrumbs',
  component: Breadcrumbs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const DataDriven: Story = {
  args: {
    items: DAYZ_ECONOMY_PATH,
  },
};

export const CompoundAPI: Story = {
  render: () => (
    <Breadcrumbs aria-label="Console navigation">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#servers" icon={<Server className="w-3.5 h-3.5" />}>
            Servers
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#servers/eu-01">Outlive Chernarus Plus</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#servers/eu-01/logs" icon={<FileText className="w-3.5 h-3.5" />}>
            Logs
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>DayZServer_x64.RPT</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumbs>
  ),
};

export const WithCustomSeparator: Story = {
  args: {
    items: [
      {
        id: 'settings',
        label: 'Global Settings',
        href: '#settings',
        icon: <Settings className="w-3.5 h-3.5" />,
      },
      { id: 'steam', label: 'SteamCMD Supervision', href: '#settings/steam' },
      { id: 'workshop', label: 'Workshop Storage Cache' },
    ],
    separator: <Slash className="w-3 h-3 text-[var(--color-text-muted)] opacity-60" />,
  },
};

export const CollapsedWithEllipsis: Story = {
  args: {
    items: [
      { id: 'root', label: 'Server Root', href: '#root', icon: <Server className="w-3.5 h-3.5" /> },
      { id: 'mpmissions', label: 'mpmissions', href: '#root/mpmissions' },
      {
        id: 'dayzOffline',
        label: 'dayzOffline.chernarusplus',
        href: '#root/mpmissions/dayzOffline',
      },
      { id: 'db', label: 'db', href: '#root/mpmissions/dayzOffline/db' },
      { id: 'types', label: 'types.xml' },
    ],
    maxItems: 3,
    itemsBeforeCollapse: 1,
    itemsAfterCollapse: 2,
  },
};

export const CompoundWithManualEllipsis: Story = {
  render: () => (
    <Breadcrumbs>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#root">Root</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis onClick={() => alert('Expand path clicked')} />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#db">db</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>types.xml</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumbs>
  ),
};
