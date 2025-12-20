"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode
}

export function Breadcrumbs({
  separator = <ChevronRight className="h-4 w-4" />,
  className,
  ...props
}: BreadcrumbProps) {
  return (
    <nav
      aria-label="breadcrumbs"
      className={cn("flex flex-wrap items-center text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"div"> {
  active?: boolean
}

export function BreadcrumbItem({
  active,
  className,
  children,
  ...props
}: BreadcrumbItemProps) {
  return (
    <div
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center hover:text-foreground transition-colors",
        active && "font-medium text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<"a"> {
  as?: React.ElementType
}

export function BreadcrumbLink({
  as: Component = "a",
  className,
  ...props
}: BreadcrumbLinkProps) {
  return (
    <Component
      className={cn("hover:text-primary hover:underline underline-offset-4", className)}
      {...props}
    />
  )
}

export interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<"li"> {
  children?: React.ReactNode
}

export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cn("mx-2 select-none", className)}
      {...props}
    >
      {children ?? <ChevronRight className="h-4 w-4" />}
    </li>
  )
}
