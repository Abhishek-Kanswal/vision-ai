export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"
import ApiPlayground from "@/components/api-playground"

export default async function Page() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-[var(--secondary)] text-foreground p-4">
      <div className="flex items-center justify-center h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] bg-[var(--secondary)] rounded-2xl shadow-lg m-auto">
        <div className="flex flex-col bg-background text-foreground w-full h-full rounded-2xl overflow-hidden">
          <ApiPlayground user={user} />
        </div>
      </div>
    </main>
  )
}