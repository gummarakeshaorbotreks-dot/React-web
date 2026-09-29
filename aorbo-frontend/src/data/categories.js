import { Mountain, Sunrise, Trees, Waves, Sparkles, Tent } from 'lucide-react';

// Travel-style categories. `tag` must match the tags used by the Django API.
export const CATEGORIES = [
  { tag: 'adventure', label: 'Adventure Treks', icon: Mountain, text: 'For thrill-seekers and explorers who crave a challenge.' },
  { tag: 'weekend', label: 'Weekend Getaways', icon: Sunrise, text: 'Perfect short escapes to unwind and recharge.' },
  { tag: 'nature', label: 'Nature Escapes', icon: Trees, text: 'Reconnect with nature through calm and scenic trails.' },
  { tag: 'beach', label: 'Beach Trails', icon: Waves, text: 'Walk along the coast, enjoy sunsets, and feel the sea breeze.' },
  { tag: 'spiritual', label: 'Spiritual Journeys', icon: Sparkles, text: 'Find peace and purpose through sacred trails.' },
  { tag: 'camping', label: 'Camping & Bonfire', icon: Tent, text: 'Experience starlit nights and warm bonfires in the wild.' },
];

export const categoryByTag = (tag) => CATEGORIES.find((c) => c.tag === tag);
