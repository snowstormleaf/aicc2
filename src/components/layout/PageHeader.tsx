import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/95 backdrop-blur">
      <div className="container mx-auto">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link to="/" className="no-underline text-lg font-semibold text-foreground">
            AI Customer Clinic
          </Link>
          <div className="flex items-center justify-end gap-2">
            {actions}
          </div>
        </div>

        {(title || description) && (
          <>
            <div className="editorial-divider" />
            <div className="space-y-3 py-6">
              {title && <h1 className="type-headline content-measure-wide">{title}</h1>}
              {description && <p className="type-deck content-measure">{description}</p>}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
