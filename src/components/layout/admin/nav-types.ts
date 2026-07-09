export type NavItem = {
  title: string
  url: string
  icon?: string
  isActive?: boolean
  items?: {
    title: string
    url: string
    icon?: string
    items?: {
      title: string
      url: string
      icon?: string
    }[]
  }[]
}
