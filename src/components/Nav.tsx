'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 py-3 flex-wrap">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-xs px-2 py-1 rounded-md transition-colors',
                pathname === link.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {link.label}
            </Link>
          ))}
          <form onSubmit={handleSearch} className="ml-auto">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-36 h-7 text-xs"
            />
          </form>
        </div>
      </div>
    </nav>
  );
}
