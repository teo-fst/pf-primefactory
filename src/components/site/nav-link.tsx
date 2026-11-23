"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Link di navigazione che segnala la pagina corrente con aria-current. */
export function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const current = pathname === href;
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center border-b-2 border-transparent px-1 text-sm font-medium hover:border-primary aria-[current=page]:border-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}
