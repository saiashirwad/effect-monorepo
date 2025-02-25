import { type LiveManagedRuntime } from "@/layers/live-layer"
import { constant } from "effect/Function"
import React from "react"
import { RuntimeContext } from "./runtime-context"

export const RuntimeProvider: React.FC<{
  children: React.ReactNode
  runtime: LiveManagedRuntime
}> = ({ children, runtime }) => {
  const mountRef = React.useRef(false)

  React.useEffect(() => {
    if (!mountRef.current) {
      mountRef.current = true
      return constant(void 0)
    }

    return () => {
      void runtime.dispose()
    }
  }, [runtime])

  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>
}
