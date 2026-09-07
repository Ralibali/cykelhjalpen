import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:vi.fn()}}));
import { parsePrice, tokenFromHash, orderSchema } from './serviceOrders';
describe('service order boundaries',()=>{
 it('uses exact öre without rounding an unreviewed third decimal',()=>{expect(parsePrice('499,95')).toBe(49995);expect(parsePrice('0')).toBe(0);for(const bad of ['1.005','-1','1e3','1000000.01','', '12 kr'])expect(parsePrice(bad)).toBeNull();});
 it('reads only UUID link tokens from the fragment',()=>{const token='00000000-0000-4000-8000-000000000001';expect(tokenFromHash('#token='+token)).toBe(token);expect(tokenFromHash('#token=private-email@example.com')).toBe('');});
 it('rejects incomplete price records and negative prices',()=>{const order={id:'00000000-0000-4000-8000-000000000001',bike:'Cykel',description:'Service',status:'intake',quotes:[{version:1,description:'Service',price_ore:-1,currency:'SEK',vat_included:true,created_at:'2026-09-07',decision:null}],history:[],revision:1,created_at:'2026-09-07'};expect(orderSchema.safeParse(order).success).toBe(false);expect(orderSchema.safeParse({...order,quotes:[]}).success).toBe(true);});
});
