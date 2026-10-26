import type {
  HeroBannerActionsProps,
  HeroBannerAsideProps,
  HeroBannerBottomProps,
  HeroBannerDescriptionProps,
  HeroBannerEyebrowProps,
  HeroBannerHeaderProps,
  HeroBannerMetaProps,
  HeroBannerProps,
  HeroBannerTitleProps,
  HeroBannerTopProps,
} from './HeroBanner.types';

export function HeroBannerTop({ ref, className = '', children, ...props }: HeroBannerTopProps) {
  return (
    <div
      ref={ref}
      className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroBannerHeader({
  ref,
  className = '',
  children,
  ...props
}: HeroBannerHeaderProps) {
  return (
    <div ref={ref} className={`space-y-1.5 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function HeroBannerEyebrow({
  ref,
  className = '',
  children,
  ...props
}: HeroBannerEyebrowProps) {
  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white tracking-wider ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroBannerTitle({
  ref,
  as: Tag = 'h2',
  className = '',
  children,
  ...props
}: HeroBannerTitleProps) {
  return (
    <Tag
      ref={ref}
      className={`text-2xl sm:text-[32px] font-semibold text-white tracking-tight leading-tight ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function HeroBannerDescription({
  ref,
  className = '',
  children,
  ...props
}: HeroBannerDescriptionProps) {
  return (
    <p
      ref={ref}
      className={`text-xs sm:text-[13px] text-slate-300 leading-relaxed ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  );
}

export function HeroBannerAside({ ref, className = '', children, ...props }: HeroBannerAsideProps) {
  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white shrink-0 self-start ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroBannerBottom({
  ref,
  className = '',
  children,
  ...props
}: HeroBannerBottomProps) {
  return (
    <div
      ref={ref}
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-6 border-t border-white/10 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroBannerMeta({ ref, className = '', children, ...props }: HeroBannerMetaProps) {
  return (
    <div
      ref={ref}
      className={`flex items-center gap-4 sm:gap-6 flex-wrap text-xs text-slate-200 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function HeroBannerActions({
  ref,
  className = '',
  children,
  ...props
}: HeroBannerActionsProps) {
  return (
    <div ref={ref} className={`flex items-center gap-2.5 flex-wrap ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

const DEFAULT_SCRIM_GRADIENT =
  'linear-gradient(135deg, rgba(16, 29, 41, 0.92) 0%, rgba(20, 37, 52, 0.80) 50%, rgba(14, 25, 36, 0.94) 100%)';

export function HeroBanner({
  ref,
  as: Component = 'div',
  backgroundImage,
  scrimClassName = '',
  eyebrow,
  title,
  titleAs = 'h2',
  subtitle,
  aside,
  meta,
  actions,
  className = '',
  contentClassName = '',
  children,
  ...props
}: HeroBannerProps) {
  const hasDirectTop = Boolean(eyebrow || title || subtitle || aside);
  const hasDirectBottom = Boolean(meta || actions);

  return (
    <Component
      ref={ref}
      className={`relative rounded-2xl overflow-hidden min-h-[180px] p-6 sm:p-7 flex flex-col justify-between shadow-[var(--shadow-card)] border border-[#203b50]/20 bg-[#142534] text-white ${className}`.trim()}
      {...props}
    >
      {/* Chernarus Panorama Scrim & Wallpaper */}
      {backgroundImage && (
        <div
          data-testid="hero-banner-bg"
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        />
      )}
      <div
        data-testid="hero-banner-scrim"
        className={`absolute inset-0 pointer-events-none ${scrimClassName}`.trim()}
        style={{
          background: scrimClassName ? undefined : DEFAULT_SCRIM_GRADIENT,
        }}
      />

      {/* Content Layer */}
      <div
        className={`relative z-10 flex flex-col justify-between flex-1 gap-6 ${contentClassName}`.trim()}
      >
        {children ?? (
          <>
            {hasDirectTop && (
              <HeroBannerTop>
                <HeroBannerHeader>
                  {eyebrow && <HeroBannerEyebrow>{eyebrow}</HeroBannerEyebrow>}
                  {title && <HeroBannerTitle as={titleAs}>{title}</HeroBannerTitle>}
                  {subtitle && <HeroBannerDescription>{subtitle}</HeroBannerDescription>}
                </HeroBannerHeader>
                {aside && <HeroBannerAside>{aside}</HeroBannerAside>}
              </HeroBannerTop>
            )}
            {hasDirectBottom && (
              <HeroBannerBottom>
                {meta && <HeroBannerMeta>{meta}</HeroBannerMeta>}
                {actions && <HeroBannerActions>{actions}</HeroBannerActions>}
              </HeroBannerBottom>
            )}
          </>
        )}
      </div>
    </Component>
  );
}

HeroBanner.Top = HeroBannerTop;
HeroBanner.Header = HeroBannerHeader;
HeroBanner.Eyebrow = HeroBannerEyebrow;
HeroBanner.Title = HeroBannerTitle;
HeroBanner.Description = HeroBannerDescription;
HeroBanner.Aside = HeroBannerAside;
HeroBanner.Bottom = HeroBannerBottom;
HeroBanner.Meta = HeroBannerMeta;
HeroBanner.Actions = HeroBannerActions;
