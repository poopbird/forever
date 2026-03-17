'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/settings',         label: 'Profile',       icon: '✦' },
  { href: '/settings/rsvp',    label: 'RSVP',          icon: '✉' },
  { href: '/settings/faqs',    label: 'FAQs',          icon: '?' },
  { href: '/settings/history', label: 'Edit History',  icon: '⏱' },
  { href: '/settings/account', label: 'Account',       icon: '⊙' },
];

export default function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-44 shrink-0 sticky top-12">
      <ul className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-sans text-sm transition-colors"
                style={{
                  background:  active ? 'rgba(201,150,74,0.12)' : 'transparent',
                  color:       active ? '#C9964A' : '#4A3728',
                  fontWeight:  active ? 600 : 400,
                }}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
