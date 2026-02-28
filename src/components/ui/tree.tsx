"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react"

import { cn } from "@/lib/utils"

interface TreeProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  data: T[]
  renderNode: (node: T, depth: number, isExpanded: boolean, toggleExpand: () => void) => React.ReactNode
  getChildren?: (node: T) => Promise<T[]> | T[]
  className?: string
}

export function Tree<T extends { id: string | number }>({
  data,
  renderNode,
  getChildren,
  className,
  ...props
}: TreeProps<T>) {
  return (
    <div className={cn("flex flex-col space-y-1", className)} {...props}>
      {data.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          getChildren={getChildren}
          renderNode={renderNode}
        />
      ))}
    </div>
  )
}

interface TreeNodeProps<T> {
  node: T
  depth: number
  getChildren?: (node: T) => Promise<T[]> | T[]
  renderNode: (node: T, depth: number, isExpanded: boolean, toggleExpand: () => void) => React.ReactNode
}

function TreeNode<T extends { id: string | number }>({
  node,
  depth,
  getChildren,
  renderNode,
}: TreeNodeProps<T>) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [children, setChildren] = React.useState<T[] | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleToggle = async () => {
    if (!isExpanded && !children && getChildren) {
      setIsLoading(true)
      try {
        const fetchedChildren = await Promise.resolve(getChildren(node))
        setChildren(fetchedChildren)
      } catch (error) {
         console.error("Failed to load generic children", error)
      } finally {
        setIsLoading(false)
      }
    }
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="flex flex-col">
      {renderNode(node, depth, isExpanded, handleToggle)}
      {
         isLoading && (
            <div 
               style={{ paddingLeft: `${(depth + 1) * 1.5}rem` }} 
               className="py-1 text-sm text-muted-foreground animate-pulse"
            >
               Loading...
            </div>
         )
      }
      {isExpanded && children && children.length > 0 && (
        <div className="flex flex-col relative w-full">
           <div 
              style={{ left: `${(depth + 1) * 1.5 - 0.75}rem` }} 
              className="absolute top-0 bottom-0 w-px bg-border" 
           />
          {children.map((childNode) => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              depth={depth + 1}
              getChildren={getChildren}
              renderNode={renderNode}
            />
          ))}
        </div>
      )}
    </div>
  )
}
