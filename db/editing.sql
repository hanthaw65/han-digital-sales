
alter table public.products add column if not exists stock_note text not null default '';

drop policy if exists admins_update_sales on public.sales;
create policy admins_update_sales on public.sales for update to authenticated
using (exists(select 1 from public.members m where m.workspace_id=sales.workspace_id and m.user_id=(select auth.uid()) and m.role='admin'))
with check (exists(select 1 from public.members m where m.workspace_id=sales.workspace_id and m.user_id=(select auth.uid()) and m.role='admin'));

drop policy if exists admins_delete_sales on public.sales;
create policy admins_delete_sales on public.sales for delete to authenticated
using (exists(select 1 from public.members m where m.workspace_id=sales.workspace_id and m.user_id=(select auth.uid()) and m.role='admin'));

drop policy if exists admins_delete_finance on public.finance_entries;
create policy admins_delete_finance on public.finance_entries for delete to authenticated
using (exists(select 1 from public.members m where m.workspace_id=finance_entries.workspace_id and m.user_id=(select auth.uid()) and m.role='admin'));

grant update, delete on public.sales to authenticated;
grant delete on public.finance_entries to authenticated;

create or replace function public.edit_sale(
 p_sale_id bigint, p_customer_name text, p_customer_contact text, p_quantity integer,
 p_sale_price bigint, p_paid_amount bigint, p_payment_method text, p_sale_date date,
 p_expiry_date date, p_note text default ''
) returns void language plpgsql security invoker set search_path='' as $$
declare
 v_sale public.sales%rowtype;
 v_product public.products%rowtype;
 v_status text;
 v_delta integer;
begin
 select * into v_sale from public.sales where id=p_sale_id for update;
 if v_sale.id is null then raise exception 'Sale not found'; end if;
 if not exists(select 1 from public.members m where m.workspace_id=v_sale.workspace_id and m.user_id=(select auth.uid()) and m.role='admin') then raise exception 'Admin required'; end if;
 if p_quantity<1 or p_sale_price<0 or p_paid_amount<0 or length(trim(p_customer_name))=0 then raise exception 'Invalid sale values'; end if;
 select * into v_product from public.products where id=v_sale.product_id for update;
 if v_product.id is null then raise exception 'Product not found'; end if;
 v_delta:=p_quantity-v_sale.quantity;
 if v_delta>0 and v_product.stock<v_delta then raise exception 'Insufficient stock'; end if;
 if p_paid_amount<=0 then v_status:='unpaid';
 elsif p_paid_amount<p_sale_price*p_quantity then v_status:='partial';
 else v_status:='paid'; end if;
 update public.products set stock=stock-v_delta where id=v_product.id;
 update public.sales set
  customer_name=trim(p_customer_name),customer_contact=left(coalesce(p_customer_contact,''),200),
  quantity=p_quantity,sale_price=p_sale_price,paid_amount=p_paid_amount,
  payment_method=left(p_payment_method,30),payment_status=v_status,sale_date=p_sale_date,
  expiry_date=p_expiry_date,note=left(coalesce(p_note,''),500)
 where id=p_sale_id;
end $$;

create or replace function public.delete_sale(p_sale_id bigint,p_restore_stock boolean default true)
returns void language plpgsql security invoker set search_path='' as $$
declare v_sale public.sales%rowtype;
begin
 select * into v_sale from public.sales where id=p_sale_id for update;
 if v_sale.id is null then raise exception 'Sale not found'; end if;
 if not exists(select 1 from public.members m where m.workspace_id=v_sale.workspace_id and m.user_id=(select auth.uid()) and m.role='admin') then raise exception 'Admin required'; end if;
 if p_restore_stock then update public.products set stock=stock+v_sale.quantity where id=v_sale.product_id; end if;
 delete from public.sales where id=p_sale_id;
end $$;

revoke all on function public.edit_sale(bigint,text,text,integer,bigint,bigint,text,date,date,text) from public,anon;
grant execute on function public.edit_sale(bigint,text,text,integer,bigint,bigint,text,date,date,text) to authenticated;
revoke all on function public.delete_sale(bigint,boolean) from public,anon;
grant execute on function public.delete_sale(bigint,boolean) to authenticated;

