import React from 'react';
import { createRoot } from 'react-dom/client';

import { act } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '../index.html');

describe('Pre-Bootstrap Animated Splash Screen (DSM-00101)', () => {
  let htmlContent: string;
  let parsedDoc: Document;
  let styleElement: HTMLStyleElement | null;
  let rootElement: HTMLElement | null;
  let splashElement: HTMLElement | null;

  beforeEach(() => {
    htmlContent = fs.readFileSync(indexPath, 'utf-8');
    const parser = new DOMParser();
    parsedDoc = parser.parseFromString(htmlContent, 'text/html');
    styleElement = parsedDoc.querySelector('head > style');
    rootElement = parsedDoc.getElementById('root');
    splashElement = parsedDoc.getElementById('dsm-splash');
  });

  describe('REQ-01 & REQ-02: Static Markup & Critical CSS Contract', () => {
    it('contains an inline <style> block in <head>', () => {
      expect(styleElement).not.toBeNull();
      expect(styleElement?.textContent).toBeDefined();
    });

    it('defines critical layout and 3D perspective rules in inline <style>', () => {
      const css = styleElement?.textContent ?? '';

      // Centered layout and fixed viewport positioning
      expect(css).toContain('#dsm-splash');
      expect(css).toContain('position: fixed');
      expect(css).toContain('display: flex');
      expect(css).toContain('align-items: center');
      expect(css).toContain('justify-content: center');

      // 3D perspective and transforms
      expect(css).toContain('perspective: 900px');
      expect(css).toContain('transform-style: preserve-3d');

      // Keyframes
      expect(css).toContain('@keyframes aegis-tent-loading');
      expect(css).toContain('@keyframes aegis-bridge-loading');
      expect(css).toContain('animation: aegis-tent-loading 8s infinite');
      expect(css).toContain('animation: aegis-bridge-loading 8s infinite');
    });

    it('defines dark color scheme support in critical <style>', () => {
      const css = styleElement?.textContent ?? '';
      expect(css).toContain('@media (prefers-color-scheme: dark)');
      expect(css).toContain('background-color: #090d12');
    });

    it('contains #dsm-splash inside #root with accessibility attributes', () => {
      expect(rootElement).not.toBeNull();
      expect(splashElement).not.toBeNull();
      expect(splashElement?.getAttribute('role')).toBe('status');
      expect(splashElement?.getAttribute('aria-live')).toBe('polite');
    });

    it('contains the animated Aegis logo SVG with correct structure and dimensions', () => {
      const svg = splashElement?.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 241 248');
      expect(svg?.getAttribute('width')).toBe('80');
      expect(svg?.getAttribute('height')).toBe('80');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(svg?.classList.contains('aegis-logo')).toBe(true);
      expect(svg?.classList.contains('is-loading')).toBe(true);

      const tentGroup = svg?.querySelector('.aegis-logo__tent');
      expect(tentGroup).not.toBeNull();
      expect(tentGroup?.querySelector('.aegis-logo__leg--left')).not.toBeNull();
      expect(tentGroup?.querySelector('.aegis-logo__leg--right')).not.toBeNull();

      const bridge = svg?.querySelector('.aegis-logo__bridge');
      expect(bridge).not.toBeNull();
    });

    it('contains an accessible screen-reader announcer span', () => {
      const announcer = splashElement?.querySelector('.sr-only');
      expect(announcer).not.toBeNull();
      expect(announcer?.textContent?.trim()).toBe('Loading Outlive DayZ Server Manager...');
    });
  });

  describe('GUARD-01: Critical Payload Budget Guard (< 4096 bytes)', () => {
    it('keeps inline critical CSS and splash SVG markup under 4,096 bytes', () => {
      const styleMarkup = styleElement?.outerHTML ?? '';
      const splashMarkup = splashElement?.outerHTML ?? '';
      const totalPayloadBytes = Buffer.byteLength(styleMarkup + splashMarkup, 'utf-8');

      // Must be non-trivial and strictly under the 4KB budget
      expect(totalPayloadBytes).toBeGreaterThan(500);
      expect(totalPayloadBytes).toBeLessThan(4096);
    });
  });

  describe('GUARD-02: DOM Containment Guard', () => {
    it('ensures #dsm-splash is strictly a direct child of #root', () => {
      expect(splashElement?.parentElement).toBe(rootElement);
      expect(rootElement?.contains(splashElement)).toBe(true);
    });

    it('ensures no splash elements exist outside #root', () => {
      const allSplashes = parsedDoc.querySelectorAll('#dsm-splash');
      expect(allSplashes).toHaveLength(1);

      const allAegisLogos = parsedDoc.querySelectorAll('.aegis-logo');
      allAegisLogos.forEach(logo => {
        expect(rootElement?.contains(logo)).toBe(true);
      });
    });
  });

  describe('GUARD-03 & REQ-04: Motion Accessibility Guard', () => {
    it('includes @media (prefers-reduced-motion: reduce) rule disabling animations', () => {
      const css = styleElement?.textContent ?? '';
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');

      const mediaIndex = css.indexOf('@media (prefers-reduced-motion: reduce)');
      expect(mediaIndex).toBeGreaterThan(-1);
      const reducedMotionBlock = css.slice(mediaIndex, mediaIndex + 250);
      expect(reducedMotionBlock).toContain('animation: none');
    });
  });

  describe('ARCH-01: Zero External Asset Dependencies', () => {
    it('does not reference external stylesheets, remote URLs, or font imports in critical CSS', () => {
      const css = styleElement?.textContent ?? '';
      expect(css).not.toContain('@import');
      expect(css).not.toMatch(/url\s*\(\s*['"]?https?:\/\//i);
      expect(css).not.toContain('@font-face');
    });

    it('does not reference external scripts, links, or image sources within #dsm-splash', () => {
      expect(splashElement?.querySelectorAll('link, script, img, iframe').length).toBe(0);
    });
  });

  describe('REQ-03: DOM Replacement Lifecycle', () => {
    let testHost: HTMLDivElement;

    beforeEach(() => {
      testHost = document.createElement('div');
      testHost.id = 'root';
      // Populate test host with exact markup parsed from index.html #root
      testHost.innerHTML = rootElement?.innerHTML ?? '';
      document.body.appendChild(testHost);
    });

    afterEach(() => {
      testHost.remove();
    });

    it('starts with #dsm-splash present in test host', () => {
      expect(testHost.querySelector('#dsm-splash')).not.toBeNull();
      expect(testHost.querySelector('.aegis-logo')).not.toBeNull();
      expect(testHost.querySelector('.sr-only')).not.toBeNull();
    });

    it('completely removes #dsm-splash when React mounts via createRoot.render', async () => {
      const root = createRoot(testHost);

      await act(async () => {
        root.render(
          React.createElement(
            'div',
            { id: 'app-mounted' },
            'DayZ Server Manager Application Active',
          ),
        );
      });

      // Assert complete removal of splash DOM nodes
      expect(testHost.querySelector('#dsm-splash')).toBeNull();
      expect(testHost.querySelector('.aegis-logo')).toBeNull();
      expect(testHost.querySelector('.sr-only')).toBeNull();

      // Assert presence of newly mounted application
      const mountedApp = testHost.querySelector('#app-mounted');
      expect(mountedApp).not.toBeNull();
      expect(mountedApp?.textContent).toBe('DayZ Server Manager Application Active');

      // Cleanup
      await act(async () => {
        root.unmount();
      });
    });
  });
});
