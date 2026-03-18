declare module "react-simple-maps" {
  import { ComponentType, ReactNode } from "react"

  interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    width?: number
    height?: number
    className?: string
    style?: Record<string, unknown>
    children?: ReactNode
  }

  interface GeographiesProps {
    geography: string
    children: (data: {
      geographies: Array<{
        rsmKey: string
        properties: { name: string; [k: string]: unknown }
        [k: string]: unknown
      }>
    }) => ReactNode
  }

  interface GeographyProps {
    geography: unknown
    fill?: string
    stroke?: string
    strokeWidth?: number
    style?: {
      default?: Record<string, unknown>
      hover?: Record<string, unknown>
      pressed?: Record<string, unknown>
    }
    onMouseEnter?: (event: unknown) => void
    onMouseMove?: (event: unknown) => void
    onMouseLeave?: (event: unknown) => void
    key?: string
  }

  interface ZoomableGroupProps {
    children?: ReactNode
    center?: [number, number]
    zoom?: number
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>
}
