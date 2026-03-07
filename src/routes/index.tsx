import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceShell } from '#/features/workspace/components/workspace-shell'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return <WorkspaceShell />
}
