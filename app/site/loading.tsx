export default function SiteLoading() {
  return (
    <div className="site-v2 site-loading" aria-busy="true" aria-live="polite">
      <section className="day-hero site-hero">
        <div className="day-hero-inner">
          <div className="site-toggle" />
          <div className="site-hero-grid">
            <div className="site-skel-copy" />
            <div className="day-ring-frame" />
          </div>
        </div>
      </section>
    </div>
  );
}
