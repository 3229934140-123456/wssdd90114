import { NavLink, Outlet } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const { userInfo } = useAppStore();

  const navItems = [
    { to: '/clues', label: '线索池' },
    { to: '/edit', label: '专报编辑' },
    { to: '/review', label: '送审记录' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gov-bg">
      <header className="bg-gov-deepblue text-white shadow-lg">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-6 h-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">舆情专报工作台</h1>
              <p className="text-xs text-blue-200/80">Public Opinion Report Workbench</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'px-5 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-white/15 text-white shadow-inner'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="relative p-2 rounded-lg text-blue-100 hover:bg-white/10 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/15">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium leading-tight">{userInfo.name}</p>
                <p className="text-xs text-blue-200/70 leading-tight">{userInfo.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
