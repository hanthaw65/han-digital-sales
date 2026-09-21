-- Stock ဝယ်ငွေကို Finance tab မှာ Admin က ကိုယ်တိုင်တစ်ကြိမ်သာ မှတ်ရန်။
drop trigger if exists initial_stock_purchase on public.products;
drop function if exists public.log_initial_stock_purchase();
