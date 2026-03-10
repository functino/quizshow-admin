'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/subscriptions', label: 'Subscriptions' },
  { href: '/part-types', label: 'Part Types' },
  { href: '/users', label: 'Users' },
  { href: '/quizzes', label: 'Quizzes' },
  { href: '/results', label: 'Results' },
  { href: '/events', label: 'Events' },
  { href: '/voices', label: 'Voices' },
  { href: '/offense', label: 'Offense' },
  { href: '/avatars', label: 'Avatars' },
  { href: '/candidates', label: 'Candidates' },
  { href: '/plans', label: 'Plans' },
  { href: '/inactive-users', label: 'Inactive' },
  { href: '/api/csv', label: 'CSV' },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/users?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-gray-900 font-bold text-lg mr-4">quizshow.io admin</span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm px-2 py-1 rounded transition-colors ${
              pathname === link.href
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {link.label}
          </Link>
        ))}
        <form onSubmit={handleSearch} className="ml-auto flex gap-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-900 w-36 focus:outline-none focus:border-blue-500"
          />
        </form>
      </div>
    </nav>
  );
}
