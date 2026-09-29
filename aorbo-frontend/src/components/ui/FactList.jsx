// Label/value rows, e.g. Duration → 6 days. Rows with no value are skipped.
export default function FactList({ items }) {
  const rows = items.filter((item) => item.value);
  if (rows.length === 0) return null;

  return (
    <dl className="fact-list">
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
