import DOMPurify from 'dompurify';
import useApi from '../../hooks/useApi';
import PageHeader from '../ui/PageHeader';
import '../../styles/Legal.css';

// Layout for Terms, Privacy Policy and User Agreement: the fixed legal
// text (children) followed by any extra sections added from the Django
// admin. `numberSection(i)` continues the document's own numbering.
export default function LegalPage({ title, updated, contentKind, numberSection, children }) {
  const { data } = useApi(`/api/content-sections/${contentKind}/`);
  const extraSections = Array.isArray(data) ? data : [];

  return (
    <div className="page">
      <PageHeader eyebrow="Legal" title={title} subtitle={updated && `Last updated: ${updated}`} />
      <div className="container container--narrow">
        <article className="surface prose legal">
          {children}
          {extraSections.map((section, i) => (
            <section key={section.id}>
              <h3>{numberSection(i)}. {section.heading}</h3>
              {section.sub_heading && <h4>{section.sub_heading}</h4>}
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.content) }} />
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
