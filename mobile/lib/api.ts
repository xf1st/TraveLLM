// API client for communicating with the existing Next.js backend
// The mobile app uses the same API endpoints as the web app

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || '';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

// Trip generation
export interface GenerateTripParams {
  departureCity: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  budget: number;
  adjustedBudget?: number;
  travelStyle?: string;
  interests?: string[];
  companions?: string;
  currency?: string;
  flightArrivalTime?: string;
  flightDepartureTime?: string;
  isFirstDayLateArrival?: boolean;
  isLastDayEarlyDeparture?: boolean;
}

export interface GenerateTripResponse {
  success: boolean;
  tripId: string;
  itinerary: DayPlan[];
  metadata: {
    model: string;
    tokensUsed: number;
    costUsd: number;
  };
}

export interface DayPlan {
  day: number;
  title: string;
  date?: string;
  activities: Activity[];
  logistics?: {
    mode: string;
    from: string;
    to: string;
    distance?: string;
    duration?: string;
    price?: string | number;
    bookingLink?: string;
  };
}

export interface Activity {
  time: string;
  placeName: string;
  desc: string;
  cost?: number;
  category?: string;
  link?: string;
  duration?: string;
  coords?: [number, number];
  reviews?: number;
  rating?: number;
}

export function generateTrip(params: GenerateTripParams, signal?: AbortSignal) {
  return apiRequest<GenerateTripResponse>('/api/deepseek', {
    method: 'POST',
    body: params as unknown as Record<string, unknown>,
    signal,
  });
}

// Trip assistant chat
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TripAssistantResponse {
  type: 'modification' | 'answer';
  content: string;
  modifications?: unknown;
}

export function sendTripAssistantMessage(
  tripId: string,
  message: string,
  itinerary: DayPlan[],
  history: ChatMessage[]
) {
  return apiRequest<TripAssistantResponse>('/api/trip-assistant', {
    method: 'POST',
    body: { tripId, message, itinerary, history },
  });
}

// Guide chat
export interface GuideChatResponse {
  content: string;
  response: string;
}

export function sendGuideChatMessage(message: string, context?: string) {
  return apiRequest<GuideChatResponse>('/api/guide-chat', {
    method: 'POST',
    body: { message, context },
  });
}

// Modify itinerary
export function modifyItinerary(
  tripId: string,
  modifications: unknown,
  currentItinerary: DayPlan[]
) {
  return apiRequest('/api/modify-itinerary', {
    method: 'POST',
    body: { tripId, modifications, currentItinerary },
  });
}

// Flight prices
export interface FlightPrice {
  price: number;
  airline: string;
  departure: string;
  arrival: string;
  duration: string;
  link?: string;
}

export function getFlightPrices(from: string, to: string, date: string) {
  return apiRequest<{ flights: FlightPrice[] }>('/api/flights/prices', {
    method: 'POST',
    body: { from, to, date },
  });
}
