import { collectModLaunchFolders, formatModFlags, type LaunchModSource } from './mods';

function mod(overrides: Partial<LaunchModSource>): LaunchModSource {
  return {
    enabled: true,
    loadTarget: 'client_server',
    folderName: '@A',
    loadOrder: 0,
    ...overrides,
  };
}

describe('collectModLaunchFolders', () => {
  it('groups enabled mods by load target in load order and counts missing folders', () => {
    const result = collectModLaunchFolders([
      mod({ folderName: '@Second', loadOrder: 2 }),
      mod({ folderName: '@First', loadOrder: 1 }),
      mod({ folderName: '@Server', loadTarget: 'server_only', loadOrder: 3 }),
      mod({ folderName: '@Optional', loadTarget: 'client_optional', loadOrder: 4 }),
      mod({ folderName: '@Disabled', enabled: false, loadOrder: 5 }),
      mod({ folderName: '   ', loadOrder: 6 }),
      mod({ folderName: ' @Trimmed ', loadTarget: 'server_only', loadOrder: 7 }),
    ]);
    expect(result).toEqual({
      modFolders: ['@First', '@Second'],
      serverModFolders: ['@Server', '@Trimmed'],
      missingFolderCount: 1,
    });
  });

  it('returns empty lists for no mods', () => {
    expect(collectModLaunchFolders([])).toEqual({
      modFolders: [],
      serverModFolders: [],
      missingFolderCount: 0,
    });
  });
});

describe('formatModFlags', () => {
  it('joins folders with semicolons and omits empty flags', () => {
    expect(formatModFlags({ modFolders: ['@A', '@B'], serverModFolders: [] })).toEqual({
      modFlag: '-mod=@A;@B',
      serverModFlag: '',
    });
    expect(formatModFlags({ modFolders: [], serverModFolders: ['@S'] })).toEqual({
      modFlag: '',
      serverModFlag: '-serverMod=@S',
    });
  });
});
