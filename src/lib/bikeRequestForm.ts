import { z } from 'zod'
import { isCykelCity, resolveCykelCityParam, type CykelCityName } from './cykelCities'

export const BIKE_TYPES = ['Vanlig cykel', 'Elcykel', 'Elsparkcykel', 'Mountainbike', 'Racercykel', 'Lådcykel', 'Barncykel', 'Annat'] as const

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

export type BikeRequestCity = CykelCityName | ''

export interface BikeRequestFormState {
  bike_type: string
  repair_category: string
  description: string
  city: BikeRequestCity
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

type TFunction = (sv: string, vars?: Record<string, string | number>) => string

export const makeBikeRequestSchema = (t: TFunction = (s) => s) => z.object({
  bike_type: z.enum(BIKE_TYPES, { errorMap: () => ({ message: t('Välj vilken typ av cykel du har') }) }),
  repair_category: z.enum(REPAIR_CATEGORIES, { errorMap: () => ({ message: t('Välj vad du behöver hjälp med') }) }),
  description: z.string().trim().min(15, t('Beskriv felet med minst 15 tecken')).max(2000),
  city: z.string().refine(isCykelCity, t('Välj en stad som Cykelhjälpen finns i')),
  area: z.string().trim().max(80).optional(),
  postcode: z.string().trim().max(10).refine((value) => !value || /^\d{3}\s?\d{2}$/.test(value), t('Ange postnummer med fem siffror')).optional(),
  urgency: z.enum(URGENCY_VALUES, { errorMap: () => ({ message: t('Välj hur brådskande ärendet är') }) }),
  can_drop_off: z.boolean(),
  wants_pickup: z.boolean(),
  customer_name: z.string().trim().min(2, t('Ange ditt namn')).max(80),
  customer_email: z.string().trim().email(t('Ange en giltig e-postadress')).max(160),
  customer_phone: z.string().trim().max(40)
    .refine((value) => /^(\+46|0046|0)\s?7[\d\s-]{8,}$/.test(value.replace(/\s+/g, ' ')), t('Ange ditt mobilnummer så vi kan sms:a dig när offerterna kommer')),
  consent: z.literal(true, { errorMap: () => ({ message: t('Du måste godkänna integritetspolicyn') }) }),
}).refine((value) => value.can_drop_off || value.wants_pickup, {
  message: t('Välj om du kan lämna cykeln eller behöver hämtning'),
  path: ['can_drop_off'],
})

// Default (Swedish) schema instance for non-component usage (e.g. tests).
export const bikeRequestSchema = makeBikeRequestSchema()

export const makeDefaultBikeRequest = (city: BikeRequestCity = ''): BikeRequestFormState => ({
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

/** City from ?stad= wins. Otherwise keep a stored draft city, never invent Linköping. */
export const resolveWizardCity = (requestedCity: unknown, draftCity?: unknown): BikeRequestCity => {
  const fromQuery = resolveCykelCityParam(requestedCity) ?? (isCykelCity(requestedCity) ? requestedCity : null)
  if (fromQuery) return fromQuery
  return isCykelCity(draftCity) ? draftCity : ''
}

export const BIKE_REQUEST_STEPS = ['Cykel', 'Problem', 'Plats', 'Kontakt & skicka']
