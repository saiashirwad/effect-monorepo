import { createFileRoute } from "@tanstack/react-router"

const Index = () => {
  return <div>Index</div>
}

export const Route = createFileRoute("/")({
  component: Index,
})
