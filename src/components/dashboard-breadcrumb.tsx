"use client";

import { usePathname } from "next/navigation";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function DashboardBreadcrumb() {
  const pathname = usePathname();

  // e.g. /dashboard/master-data/farmer -> ["dashboard", "master-data", "farmer"]
  const segments = pathname.split('/').filter(Boolean);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          
          // Format text: "master-data" -> "Master Data"
          const text = segment
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem className={!isLast ? "hidden md:block" : ""}>
                {!isLast ? (
                  <BreadcrumbLink href={href}>{text}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{text}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
