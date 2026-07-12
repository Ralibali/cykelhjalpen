import { z } from 'zod'
import { DEFAULT_CYKEL_CITY, isCykelCity, type CykelCityName } from './cykelCities'

export const BIKE_TYPES = ['Vanlig cykel', 'Elcykel', 'Mountainbike', 'Racercykel', 'Lådcykel', 'Barncykel', 'Annat'] as const

export const REPAIR_CATEGORIES = [
  'Punktering / däckbyte',
  'Bromsar',
  'Växlar / kedja',
  'Service / genomgång',
  'Elcykel-problem',
  'Hjul / ekrar',
  'Lyse / elektronik',
  'Annat',
] as const

export const URGENCY_OPTIONS = [
  { value: 'asap', label: 'Så snart som möjligt' },
  { value: 'this_week', label: 'Den här veckan' },
  { value: 'flexible', label: 'Flexibel' },
] as const

const URGENCY_VALUES = ['asap', 'this_week', 'flexible'] as const

export interface BikeRequestFormState {
  bike_type: string
  repair_category: string
  description: string
  city: CykelCityName
  area: string
  postcode: string
  urgency: string
  can_drop_off: boolean
  wants_pickup: boolean
  customer_name: string
  customer_email: string
  customer_phone: string
  consent: boolean
}

export const bikeRequestSchema = z.object({
  bike_type: z.enum(BIKE_TYPES, { errorMap: () => ({ message: 'Välj vilken typ av cykel du har' }) }),
  repair_category: z.enum(REPAIR_CATEGORIES, { errorMap: () => ({ message: 'Välj vad du behöver hjälp med' }) }),
  description: z.string().trim().min(10, 'Beskriv felet med minst tio tecken').max(2000),
  city: z.string().refine(isCykelCity, 'Välj en stad som Cykelhjälpen finns i'),
  area: z.string().trim().max(80).optional(),
  postcode: z.string().trim().max(10).refine((value) => !value || /^\d{3}\s?\d{2}$/.test(value), 'Ange postnummer med fem siffror').optional(),
  urgency: z.enum(URGENCY_VALUES, { errorMap: () => ({ message: 'Välj hur brådskande ärendet är' }) }),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2, 'Ange ditt namn').max(80),
  customer_email: z.string().trim().email('Ange en giltig e-postadress').max(160),
  customer_phone: z.string().trim().max(40).optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Du måste godkänna integritetspolicyn' }) }),
}).refine((value) => value.can_drop_off || value.wants_pickup, {
  message: 'Välj om du kan lämna cykeln eller behöver hämtning',
  path: ['can_drop_off'],
})

export const makeDefaultBikeRequest = (city: CykelCityName = DEFAULT_CYKEL_CITY): BikeRequestFormState => ({
  bike_type: '',
  repair_category: '',
  description: '',
  city,
  area: '',
  postcode: '',
  urgency: 'flexible',
  can_drop_off: true,
  wants_pickup: false,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  consent: false,
})

export const BIKE_REQUEST_STEPS = ['Cykel', 'Problem', 'Plats', 'Kontakt & skicka']
