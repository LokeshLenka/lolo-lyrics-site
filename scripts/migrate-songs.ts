import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { SONG_DATABASE } from "../src/songs"

dotenv.config({ path: ".env.migration" })

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.migration",
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function migrateSongs() {
  const rows = SONG_DATABASE.map((song, index) => ({
    title: song.title,
    lyrics: song.lyrics.join("\n"),
    color: song.color,
    sort_order: index + 1,
    is_live: false,
  }))

  const { error } = await supabase.from("songs").insert(rows)

  if (error) {
    throw error
  }

  console.log(`Successfully inserted ${rows.length} songs.`)
}

migrateSongs().catch((error) => {
  console.error("Migration failed:", error.message)
  process.exit(1)
})