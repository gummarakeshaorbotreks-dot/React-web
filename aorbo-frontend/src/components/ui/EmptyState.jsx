import { Compass } from 'lucide-react';

// Shown when a list is empty or a request failed. Keep messages written
// for travellers, never for developers.
export default function EmptyState({ icon: Icon = Compass, title, text, action }) {
  return (
    <div className="empty-state">
      <span className="icon-tile icon-tile--lg" aria-hidden="true"><Icon /></span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
