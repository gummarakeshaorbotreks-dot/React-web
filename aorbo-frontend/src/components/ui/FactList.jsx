// Label/value rows, e.g. Duration → 6 days. Rows with no value are skipped.
// `plain`: values are sentences (trek facts: "about 3,800 m"), shown as written, not capitalised.
export default function FactList({ items, plain = false }) {
  const rows = items.filter((item) => item.value);
  if (rows.length === 0) return null;

  return (
    <dl className={plain ? 'fact-list fact-list--plain' : 'fact-list'}>
      {rows.map(({ icon: Icon, label, value }) => (
        <div className="fact-row" key={label}>
          <dt>
            {Icon && <Icon aria-hidden="true" />}
            {label}
          </dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
