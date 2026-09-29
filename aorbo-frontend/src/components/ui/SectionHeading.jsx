export default function SectionHeading({ title, subtitle, eyebrow, center = false, as: Tag = 'h2' }) {
  return (
    <div className={`section-heading${center ? ' section-heading--center' : ''}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Tag className="section-title">{title}</Tag>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  );
}
