import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe,expect,it,vi } from 'vitest';
const mock=vi.hoisted(()=>({owner:vi.fn()}));
vi.mock('@/lib/serviceOrders',async()=>({...await vi.importActual('@/lib/serviceOrders'),ownerAction:mock.owner}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:vi.fn()}}));
import OrderWorkspace from './OrderWorkspace';
import type { ServiceOrder } from '@/lib/serviceOrders';
const order:ServiceOrder={id:'00000000-0000-4000-8000-000000000001',customer:{name:'Kund',email:null,phone:'123'},bike:'Cykel',description:'Kontrollera bromsar',status:'intake',quotes:[],history:[],revision:1,created_at:'2026-09-07'};
describe('workshop quote review',()=>{
 it('keeps failed drafts and requires explicit review after a concurrent change',async()=>{
  mock.owner.mockRejectedValueOnce(new Error('Kunde inte spara'));
  const onChange=vi.fn();const view=render(<OrderWorkspace order={order} onChange={onChange}/>);
  fireEvent.change(screen.getByLabelText('Arbete och delar som ingår'),{target:{value:'Bromsbelägg och arbete'}});
  fireEvent.change(screen.getByLabelText('Totalpris inkl. moms, kr'),{target:{value:'499,95'}});
  fireEvent.click(screen.getByRole('button',{name:'Spara prisförslag'}));await screen.findByRole('alert');
  expect(screen.getByLabelText('Arbete och delar som ingår')).toHaveValue('Bromsbelägg och arbete');expect(onChange).not.toHaveBeenCalled();
  view.rerender(<OrderWorkspace order={{...order,revision:2}} onChange={onChange}/>);
  expect(screen.getByRole('button',{name:'Spara prisförslag'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Jag har jämfört med senaste versionen'}));
  mock.owner.mockResolvedValueOnce({...order,revision:3,status:'awaiting_approval'});
  fireEvent.click(screen.getByRole('button',{name:'Spara prisförslag'}));
  await waitFor(()=>expect(onChange).toHaveBeenCalled());
  expect(mock.owner.mock.calls[1]).toEqual(['quote',order.id,2,{description:'Bromsbelägg och arbete',price_ore:49995}]);
 });
});
