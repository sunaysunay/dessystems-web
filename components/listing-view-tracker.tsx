"use client"
import { useEffect } from "react"
import { useActivityLog } from "@/hooks/use-activity-log"

interface ListingViewTrackerProps {
  listingId: string
  listingTitle: string
  listingSlug: string
}

export function ListingViewTracker({ listingId, listingTitle, listingSlug }: ListingViewTrackerProps) {
  const { logEvent } = useActivityLog()

  useEffect(() => {
    logEvent({ eventType: "listing_view", listingId, listingTitle, listingSlug })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
