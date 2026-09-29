// Validation rules for the contact form. Messages are written for visitors.

// Exact email format: local-part@domain.tld
// - no leading/trailing/consecutive dots in local part
// - domain must have at least one dot, valid label chars, TLD of 2+ letters
const EMAIL_REGEX = /^(?!.*\.\.)[a-zA-Z0-9._%+-]+(?<!\.)@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

// Indian mobile: exactly 10 digits, first digit must be 6, 7, 8, or 9
const INDIAN_MOBILE_REGEX = /^[6789][0-9]{9}$/;

// Whitelist of real top-level domains. A regex like [a-zA-Z]{2,} alone would
// wrongly accept junk like "gmail.cokhvbjhjgh" since it's just letters.
const SIMPLE_TLDS = new Set([
  'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name',
  'in', 'co', 'io', 'me', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn',
  'ru', 'br', 'za', 'nl', 'es', 'it', 'ch', 'se', 'no', 'nz', 'sg', 'ae',
  'app', 'dev', 'xyz', 'online', 'store', 'tech', 'ai', 'shop', 'site',
]);
const COMPOUND_TLDS = new Set([
  'co.in', 'org.in', 'net.in', 'gov.in', 'ac.in', 'edu.in', 'nic.in', 'res.in',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'com.au', 'net.au', 'org.au', 'co.nz',
]);

const hasValidTld = (domain) => {
  const labels = domain.toLowerCase().split('.');
  if (labels.length < 2) return false;
  const lastTwo = labels.slice(-2).join('.');
  if (COMPOUND_TLDS.has(lastTwo)) return true;
  const lastOne = labels[labels.length - 1];
  return SIMPLE_TLDS.has(lastOne);
};

// Catches common typos of popular email domains (e.g. gmail.co -> gmail.com)
const DOMAIN_TYPO_FIXES = {
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gamil.com': 'gmail.com',
  'yahoo.co': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'hotmail.co': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'outlook.co': 'outlook.com',
  'outlok.com': 'outlook.com',
  'rediffmail.co': 'rediffmail.com',
  'icloud.co': 'icloud.com',
};

const getDomainTypoFix = (email) => {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  return DOMAIN_TYPO_FIXES[domain] || null;
};

export const validateField = (name, value) => {
  switch (name) {
    case 'email': {
      if (!value) return 'Please fill this field. Example: yourname@gmail.com';
      if (!EMAIL_REGEX.test(value)) return 'That email looks incorrect. Please enter it like: yourname@gmail.com';
      const domain = value.split('@')[1] || '';
      if (!hasValidTld(domain)) return 'That domain ending doesn\'t look real. Please enter it like: yourname@gmail.com';
      const typoFix = getDomainTypoFix(value);
      if (typoFix) return `Looks like a typo. Did you mean "${value.split('@')[0]}@${typoFix}"?`;
      return '';
    }
    case 'mobile':
      if (!value) return 'Please fill this field. Example: 9876543210';
      if (value.length < 10) return `Enter all 10 digits. Example: 9876543210 (${value.length}/10 entered)`;
      if (!INDIAN_MOBILE_REGEX.test(value)) return 'Number must start with 6, 7, 8, or 9. Example: 9876543210';
      return '';
    case 'name':
      if (!value) return 'Please fill this field. Example: Ravi Kumar';
      if (!/^[A-Za-z\s]{2,50}$/.test(value)) return 'Use letters only, 2–50 characters. Example: Ravi Kumar';
      return '';
    case 'comment':
      if (!value) return 'Please fill this field with your message (at least 10 characters).';
      if (value.length < 10) return `Message too short. Add ${10 - value.length} more character(s).`;
      if (value.length > 500) return 'Message is too long. Please keep it under 500 characters.';
      return '';
    default:
      return '';
  }
};
