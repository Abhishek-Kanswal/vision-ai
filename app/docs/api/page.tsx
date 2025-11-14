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
    <ApiPlayground user={user} />

  )
}