/**
 * Itinerary Types - Shared interfaces for travel routes
 */

export interface Activity {
  time: string;
  type: 'transport' | 'hotel' | 'food' | 'activity' | 'check-in' | 'checkin';
  title: string;
  placeName: string;
  desc: string;
  cost: string;
  price?: string;
  link?: string;
  imageQuery?: string;
  note?: string;
  realLink?: string;
  snippet?: string;
}

export interface Logistics {
  from?: string;
  to?: string;
  mode?: string;
  duration?: string;
  distance?: string;
  bookingLink?: string;
  note?: string;
  price?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  dayTotal: string;
  activities: Activity[];
  logistics?: Logistics;
  endCity?: string;
}

export interface ViralSpot {
  name: string;
  desc: string;
  mapLink: string;
  realLink?: string;
  snippet?: string;
}

export interface Country {
  name: string;
  visaRequired: boolean;
  visaType?: string;
}

export interface RouteData {
  title: string;
  description: string;
  totalBudget: string;
  budgetAnalysis: {
    avgAccommodation: string;
    avgFood: string;
    avgTransport: string;
    avgActivities: string;
    avgMisc: string;
  };
  visaAdvice: string;
  paymentAdvice: string;
  safetyInfo: {
    rating: number;
    tips: string;
  };
  restrictions: string | null;
  countries: Country[];
  tags: string[];
  viralSpots: ViralSpot[];
  itinerary: ItineraryDay[];
  coverImage?: string;
  start_date?: string;
  end_date?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    costUsd: number;
    costRub: number;
  };
}
