import { createRef } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  HeroBanner,
  HeroBannerActions,
  HeroBannerAside,
  HeroBannerBottom,
  HeroBannerDescription,
  HeroBannerEyebrow,
  HeroBannerHeader,
  HeroBannerMeta,
  HeroBannerTitle,
  HeroBannerTop,
} from './HeroBanner';

describe('HeroBanner Component', () => {
  it('renders root container with default atmospheric scrim and children', () => {
    render(
      <HeroBanner data-testid="hero">
        <p>Hero Content</p>
      </HeroBanner>,
    );

    const banner = screen.getByTestId('hero');
    expect(banner).toBeInTheDocument();
    expect(screen.getByText('Hero Content')).toBeInTheDocument();

    const scrim = screen.getByTestId('hero-banner-scrim');
    expect(scrim).toBeInTheDocument();
  });

  it('renders background image when backgroundImage prop is provided', () => {
    const bgUrl = '/assets/images/misty-chernarus-bg.jpg';
    render(<HeroBanner backgroundImage={bgUrl} data-testid="hero" />);

    const bgElement = screen.getByTestId('hero-banner-bg');
    expect(bgElement).toBeInTheDocument();
    expect(bgElement).toHaveStyle({ backgroundImage: `url('${bgUrl}')` });
  });

  it('applies custom scrimClassName when provided', () => {
    render(<HeroBanner scrimClassName="bg-black/80" data-testid="hero" />);

    const scrim = screen.getByTestId('hero-banner-scrim');
    expect(scrim).toHaveClass('bg-black/80');
  });

  it('renders full compound slot hierarchy properly', () => {
    render(
      <HeroBanner data-testid="hero">
        <HeroBanner.Top data-testid="hero-top">
          <HeroBanner.Header data-testid="hero-header">
            <HeroBanner.Eyebrow data-testid="hero-eyebrow">DAYZ / DEDICATED</HeroBanner.Eyebrow>
            <HeroBanner.Title data-testid="hero-title">Chernarus Survival</HeroBanner.Title>
            <HeroBanner.Description data-testid="hero-desc">
              Outlive Project · 1PP
            </HeroBanner.Description>
          </HeroBanner.Header>
          <HeroBanner.Aside data-testid="hero-aside">Frankfurt, DE</HeroBanner.Aside>
        </HeroBanner.Top>
        <HeroBanner.Bottom data-testid="hero-bottom">
          <HeroBanner.Meta data-testid="hero-meta">185.38.151.42:2302</HeroBanner.Meta>
          <HeroBanner.Actions data-testid="hero-actions">
            <button type="button">Console</button>
          </HeroBanner.Actions>
        </HeroBanner.Bottom>
      </HeroBanner>,
    );

    expect(screen.getByTestId('hero-top')).toBeInTheDocument();
    expect(screen.getByTestId('hero-header')).toBeInTheDocument();
    expect(screen.getByTestId('hero-eyebrow')).toHaveTextContent('DAYZ / DEDICATED');
    expect(screen.getByTestId('hero-title')).toHaveTextContent('Chernarus Survival');
    expect(screen.getByTestId('hero-desc')).toHaveTextContent('Outlive Project · 1PP');
    expect(screen.getByTestId('hero-aside')).toHaveTextContent('Frankfurt, DE');
    expect(screen.getByTestId('hero-bottom')).toBeInTheDocument();
    expect(screen.getByTestId('hero-meta')).toHaveTextContent('185.38.151.42:2302');
    expect(screen.getByRole('button', { name: /console/i })).toBeInTheDocument();
  });

  it('renders named subcomponents identically to compound properties', () => {
    render(
      <HeroBanner>
        <HeroBannerTop>
          <HeroBannerHeader>
            <HeroBannerEyebrow>CATEGORY</HeroBannerEyebrow>
            <HeroBannerTitle>Standalone Title</HeroBannerTitle>
            <HeroBannerDescription>Standalone Desc</HeroBannerDescription>
          </HeroBannerHeader>
          <HeroBannerAside>Aside</HeroBannerAside>
        </HeroBannerTop>
        <HeroBannerBottom>
          <HeroBannerMeta>Meta</HeroBannerMeta>
          <HeroBannerActions>Actions</HeroBannerActions>
        </HeroBannerBottom>
      </HeroBanner>,
    );

    expect(screen.getByText('Standalone Title')).toBeInTheDocument();
    expect(screen.getByText('Standalone Desc')).toBeInTheDocument();
  });

  it('supports custom heading levels for Title', () => {
    const { rerender } = render(
      <HeroBanner>
        <HeroBanner.Title as="h1">Main Heading</HeroBanner.Title>
      </HeroBanner>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Main Heading');

    rerender(
      <HeroBanner>
        <HeroBanner.Title as="h3">Sub Heading</HeroBanner.Title>
      </HeroBanner>,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Sub Heading');
  });

  it('supports custom container element (e.g. section or header)', () => {
    render(
      <HeroBanner as="section" aria-label="Server Banner">
        <HeroBanner.Title>Server Overview</HeroBanner.Title>
      </HeroBanner>,
    );

    const section = screen.getByRole('region', { name: /server banner/i });
    expect(section.tagName.toLowerCase()).toBe('section');
  });

  it('renders direct props when children is omitted', () => {
    render(
      <HeroBanner
        eyebrow="DIRECT EYEBROW"
        title="Direct Title"
        titleAs="h1"
        subtitle="Direct Subtitle"
        aside={<span>Direct Aside</span>}
        meta={<span>Direct Meta</span>}
        actions={<button type="button">Direct Action</button>}
      />,
    );

    expect(screen.getByText('DIRECT EYEBROW')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Direct Title');
    expect(screen.getByText('Direct Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Direct Aside')).toBeInTheDocument();
    expect(screen.getByText('Direct Meta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /direct action/i })).toBeInTheDocument();
  });

  it('forwards refs to root element and subcomponents', () => {
    const bannerRef = createRef<HTMLDivElement>();
    const titleRef = createRef<HTMLHeadingElement>();

    render(
      <HeroBanner ref={bannerRef}>
        <HeroBanner.Title ref={titleRef}>Ref Title</HeroBanner.Title>
      </HeroBanner>,
    );

    expect(bannerRef.current).toBeInstanceOf(HTMLDivElement);
    expect(titleRef.current).toBeInstanceOf(HTMLHeadingElement);
  });
});
