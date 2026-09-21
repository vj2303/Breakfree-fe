import React from 'react'

// The atom pipeline renders its own shell (sidebar + top bar), so this layout
// adds nothing around it.
export default function AITrainerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
