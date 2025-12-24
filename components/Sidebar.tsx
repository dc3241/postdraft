'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Library, Settings, Feather, Globe, Mic2 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/library', icon: Library, label: 'Library' },
  { href: '/content-sources', icon: Globe, label: 'Content Sources' },
  { href: '/brand-voices', icon: Mic2, label: 'Brand Voices' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-stone-100 border-r border-stone-200 flex flex-col items-center py-4 z-50">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta to-terracotta/80 flex items-center justify-center mb-8 shadow-sm hover:shadow-md transition-shadow"
      >
        <Feather className="w-5 h-5 text-white" />
      </Link>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'bg-terracotta text-white shadow-sm'
                    : 'text-stone-500 hover:bg-stone-200 hover:text-stone-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
              </div>
              {/* Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-stone-800 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-lg">
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-stone-800 rotate-45" />
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
