import TravelDashboard from "@/components/travel/TravelDashboard"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "3D Карта β | TraveLLM",
  description: "Интерактивная 3D-карта маршрута",
}

export default function DashboardPage() {
  return <TravelDashboard />
}
