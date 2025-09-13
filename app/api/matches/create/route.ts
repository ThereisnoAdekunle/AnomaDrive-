import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { passenger_intent_id, driver_availability_id, match_score, agreed_price, pickup_time, pickup_location } =
      await request.json()

    // Verify the user is either the passenger or driver in this match
    const { data: intent } = await supabase
      .from("passenger_intents")
      .select("passenger_id")
      .eq("id", passenger_intent_id)
      .single()

    const { data: availability } = await supabase
      .from("driver_availability")
      .select("driver_id")
      .eq("id", driver_availability_id)
      .single()

    if (!intent || !availability) {
      return NextResponse.json({ error: "Invalid intent or availability" }, { status: 404 })
    }

    if (user.id !== intent.passenger_id && user.id !== availability.driver_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Create the match
    const { data: match, error } = await supabase
      .from("intent_matches")
      .insert({
        passenger_intent_id,
        driver_availability_id,
        match_score,
        agreed_price,
        pickup_time,
        pickup_location,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ match })
  } catch (error) {
    console.error("Error creating match:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
