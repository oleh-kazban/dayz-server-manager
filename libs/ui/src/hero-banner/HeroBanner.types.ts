import type { HTMLAttributes, ReactNode, Ref } from 'react';

export type HeroBannerContainerTag = 'div' | 'section' | 'article' | 'header';
export type HeroBannerTitleTag = 'h1' | 'h2' | 'h3' | 'h4';

export interface HeroBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Root semantic container element.
   * @default 'div'
   */
  as?: HeroBannerContainerTag;

  /**
   * Optional scenic background image URL.
   */
  backgroundImage?: string;

  /**
   * Optional custom scrim classes or gradient override.
   * If not provided, defaults to the canonical Outlive dark atmospheric gradient.
   */
  scrimClassName?: string;

  /**
   * Optional direct prop for the category eyebrow / badge.
   * Rendered automatically when `children` is omitted.
   */
  eyebrow?: ReactNode;

  /**
   * Optional direct prop for the primary headline.
   * Rendered automatically when `children` is omitted.
   */
  title?: ReactNode;

  /**
   * Semantic heading level for the title when using direct props.
   * @default 'h2'
   */
  titleAs?: HeroBannerTitleTag;

  /**
   * Optional direct prop for the subtitle or atmospheric voice copy.
   * Rendered automatically when `children` is omitted.
   */
  subtitle?: ReactNode;

  /**
   * Optional direct prop for the top-right auxiliary context area (e.g. location tag).
   * Rendered automatically when `children` is omitted.
   */
  aside?: ReactNode;

  /**
   * Optional direct prop for the bottom metadata bar.
   * Rendered automatically when `children` is omitted.
   */
  meta?: ReactNode;

  /**
   * Optional direct prop for the bottom action controls.
   * Rendered automatically when `children` is omitted.
   */
  actions?: ReactNode;

  /**
   * Ref forwarded to the root element.
   */
  ref?: Ref<HTMLDivElement>;

  /**
   * Custom classes for the inner z-10 content wrapper.
   */
  contentClassName?: string;

  /**
   * Custom child content for pure compound slot composition.
   */
  children?: ReactNode;
}

export interface HeroBannerTopProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface HeroBannerHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface HeroBannerEyebrowProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface HeroBannerTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeroBannerTitleTag;
  ref?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
}

export interface HeroBannerDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  ref?: Ref<HTMLParagraphElement>;
  children?: ReactNode;
}

export interface HeroBannerAsideProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface HeroBannerBottomProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface HeroBannerMetaProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

export interface HeroBannerActionsProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}
