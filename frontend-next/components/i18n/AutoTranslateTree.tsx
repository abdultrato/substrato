"use client"

import React, { ReactNode } from "react"
import { useLanguage } from "@/hooks/useLanguage"

const STRING_PROPS = [
  "placeholder",
  "title",
  "subtitle",
  "description",
  "label",
  "emptyMessage",
  "hint",
  "searchPlaceholder",
  "submitLabel",
  "valueLabel",
  "alt",
  "aria-label",
] as const

function translateNode(node: ReactNode, tr: (value: string) => string): ReactNode {
  if (typeof node === "string") return tr(node)
  if (Array.isArray(node)) return node.map((item) => translateNode(item, tr))
  if (!React.isValidElement(node)) return node

  const props = node.props as Record<string, any>
  let changed = false
  const nextProps: Record<string, any> = {}

  if (props.children !== undefined) {
    const nextChildren = React.Children.map(props.children, (child) => translateNode(child, tr))
    if (nextChildren !== props.children) {
      nextProps.children = nextChildren
      changed = true
    }
  }

  for (const key of STRING_PROPS) {
    const value = props[key]
    if (typeof value === "string") {
      const translated = tr(value)
      if (translated !== value) {
        nextProps[key] = translated
        changed = true
      }
    }
  }

  if (!changed) return node
  return React.cloneElement(node, nextProps)
}

export default function AutoTranslateTree({ children }: { children: ReactNode }) {
  const { tr } = useLanguage()
  return <>{translateNode(children, tr)}</>
}
