import { type ReactNode } from "react";

export default function EntityLink({
  href,
  children,
  className = "text-blue-700 dark:text-blue-300 hover:underline",
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
