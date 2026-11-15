import { useRef, useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../button';

import { CodeDiffView } from './CodeDiffView';
import { CodeEditor } from './CodeEditor';
import type { CodeEditorDiagnostic, CodeEditorHandle } from './CodeEditor.types';

const SERVER_DZ_CFG = `// serverDZ.cfg
hostname = "Aegis ""Cold Front"" PvE";
password = "********";
passwordAdmin = "********";
maxPlayers = 60;
verifySignatures = 2;
forceSameBuild = 1;
disable3rdPerson = 0;
serverTime = "SystemTime";
serverTimeAcceleration = 4.5;
guaranteedUpdates = true;

/* Mission rotation */
class Missions
{
    class DayZ
    {
        template = "dayzOffline.chernarusplus";
    };
};
`;

const SERVER_DZ_CFG_REVISED = SERVER_DZ_CFG.replace('maxPlayers = 60;', 'maxPlayers = 80;')
  .replace('serverTimeAcceleration = 4.5;', 'serverTimeAcceleration = 6;')
  .replace('dayzOffline.chernarusplus', 'dayzOffline.enoch');

const BROKEN_CFG = `hostname = "Aegis PvE";
maxPlayers = 600;
serverTimeAcceleration = 4.5
class Missions
{
    class DayZ
    {
        template = "";
    };
};
`;

const BROKEN_DIAGNOSTICS: CodeEditorDiagnostic[] = [
  {
    severity: 'warning',
    message: 'maxPlayers must be between 1 and 127.',
    line: 2,
    column: 14,
    endLine: 2,
    endColumn: 17,
  },
  {
    severity: 'error',
    message: "Expected ';' after value.",
    line: 3,
    column: 30,
    endLine: 3,
    endColumn: 30,
  },
  {
    severity: 'error',
    message: 'Missions.DayZ.template must not be empty.',
    line: 8,
    column: 20,
    endLine: 8,
    endColumn: 22,
  },
];

function protectedLineRanges(text: string, keys: readonly string[]) {
  const ranges: { from: number; to: number }[] = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const key = line.split('=')[0].trim();
    if (keys.includes(key)) ranges.push({ from: offset, to: offset + line.length });
    offset += line.length + 1;
  }
  return ranges;
}

const meta: Meta<typeof CodeEditor> = {
  title: 'Forms/CodeEditor',
  component: CodeEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  args: {
    language: 'bohemia-cfg',
    ariaLabel: 'serverDZ.cfg',
    containerClassName: 'h-96',
  },
};

export default meta;
type Story = StoryObj<typeof CodeEditor>;

export const Default: Story = {
  render: args => {
    const [value, setValue] = useState(SERVER_DZ_CFG);
    return <CodeEditor {...args} value={value} onChange={setValue} />;
  },
};

export const ReadOnly: Story = {
  args: {
    value: SERVER_DZ_CFG,
    readOnly: true,
  },
};

export const WithDiagnostics: Story = {
  render: args => {
    const [value, setValue] = useState(BROKEN_CFG);
    const editorRef = useRef<CodeEditorHandle>(null);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {BROKEN_DIAGNOSTICS.map(diagnostic => (
            <Button
              key={`${diagnostic.line}:${diagnostic.column}`}
              variant="secondary"
              onClick={() => editorRef.current?.revealLine(diagnostic.line)}
            >
              Line {diagnostic.line}
            </Button>
          ))}
        </div>
        <CodeEditor
          {...args}
          ref={editorRef}
          value={value}
          onChange={setValue}
          diagnostics={value === BROKEN_CFG ? BROKEN_DIAGNOSTICS : []}
        />
      </div>
    );
  },
};

export const WithReadOnlyRanges: Story = {
  render: args => {
    const [value, setValue] = useState(SERVER_DZ_CFG);
    return (
      <CodeEditor
        {...args}
        value={value}
        onChange={setValue}
        readOnlyRanges={protectedLineRanges(value, ['password', 'passwordAdmin'])}
      />
    );
  },
};

export const DiffUnified: Story = {
  render: () => (
    <CodeDiffView
      original={SERVER_DZ_CFG}
      modified={SERVER_DZ_CFG_REVISED}
      language="bohemia-cfg"
      ariaLabel="Revision comparison"
    />
  ),
};

export const DiffSideBySide: Story = {
  render: () => (
    <CodeDiffView
      original={SERVER_DZ_CFG}
      modified={SERVER_DZ_CFG_REVISED}
      language="bohemia-cfg"
      layout="side-by-side"
      ariaLabel="Revision comparison"
    />
  ),
};
