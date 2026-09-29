// A white card with an icon + title heading. Used for every content block
// on the About, trek and destination pages.
export default function InfoCard({ icon: Icon, title, as: Tag = 'h2', className = '', children }) {
  return (
    <section className={`surface ${className}`.trim()}>
      {title && (
        <Tag className="surface-title">
          {Icon && <span className="icon-tile" aria-hidden="true"><Icon /></span>}
          {title}
        </Tag>
      )}
      {children}
    </section>
  );
}
