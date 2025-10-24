export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"
import ClientChatPage from "./page.client"

export default async function Page() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <ClientChatPage user={user} />
}
