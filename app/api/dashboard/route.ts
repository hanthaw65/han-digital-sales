import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function context() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = String(claimsData?.claims?.sub ?? "");
  if (!userId) return null;
  const { data: member } = await supabase
    .from("members")
    .select("workspace_id, role, display_name")
    .eq("user_id", userId)
    .maybeSingle();
  return member ? { supabase, userId, member } : null;
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return bad("Login သို့မဟုတ် Access Code လိုအပ်ပါတယ်", 401);
  const [{ data: products, error: productError }, { data: sales, error: saleError }, { data: finance, error: financeError }, { data: financeSummary, error: summaryError }] = await Promise.all([
    ctx.supabase.from("products").select("*").eq("workspace_id", ctx.member.workspace_id).order("name"),
    ctx.supabase.from("sales").select("*").eq("workspace_id", ctx.member.workspace_id).order("sale_date", { ascending: false }).limit(250),
    ctx.supabase.from("finance_entries").select("*").eq("workspace_id", ctx.member.workspace_id).order("entry_date", { ascending: false }).order("id", { ascending: false }).limit(250),
    ctx.supabase.rpc("finance_summary", { p_workspace_id: ctx.member.workspace_id }),
  ]);
  if (productError || saleError) return bad(productError?.message || saleError?.message || "Data မရနိုင်ပါ", 500);
  if (financeError || summaryError) return bad(financeError?.message || summaryError?.message || "ငွေစာရင်း မရနိုင်ပါ", 500);
  return Response.json({
    financeSummary,
    finance: (finance ?? []).map(f => ({ id: Number(f.id), kind: f.kind, label: f.label, amount: Number(f.amount), entryDate: f.entry_date, paymentMethod: f.payment_method, note: f.note, automatic: f.source_product_id !== null })),
    user: { displayName: ctx.member.display_name, role: ctx.member.role },
    products: (products ?? []).map(p => ({
      id: Number(p.id), name: p.name, packageName: p.package_name, purchasePrice: Number(p.purchase_price),
      defaultSalePrice: Number(p.default_sale_price), stock: p.stock, lowStockAt: p.low_stock_at, supplier: p.supplier, stockNote: p.stock_note,
    })),
    sales: (sales ?? []).map(s => ({
      id: Number(s.id), productId: Number(s.product_id), productName: s.product_name, customerName: s.customer_name, customerContact: s.customer_contact,
      quantity: s.quantity, purchasePrice: Number(s.purchase_price), salePrice: Number(s.sale_price), paidAmount: Number(s.paid_amount),
      paymentMethod: s.payment_method, paymentStatus: s.payment_status, saleDate: s.sale_date, expiryDate: s.expiry_date,
      staffName: s.staff_name, note: s.note,
    })),
  });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return bad("Login သို့မဟုတ် Access Code လိုအပ်ပါတယ်", 401);
  const body = await request.json() as Record<string, unknown>;

  if (body.action === "delete-finance") {
    if (ctx.member.role !== "admin") return bad("Admin သာ ငွေစာရင်းဖျက်နိုင်ပါတယ်", 403);
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return bad("မှတ်တမ်း ID မမှန်ပါ");
    const { data: deleted, error } = await ctx.supabase.from("finance_entries").delete().eq("id", id).eq("workspace_id", ctx.member.workspace_id).select("id").maybeSingle();
    if (error) return bad(error.message);
    if (!deleted) return bad("ဖျက်နိုင်သည့် မှတ်တမ်းမတွေ့ပါ", 404);
    return Response.json({ saved: true });
  }

  if (body.action === "add-finance" || body.action === "edit-finance") {
    if (ctx.member.role !== "admin") return bad("Admin သာ ငွေစာရင်းပြင်နိုင်ပါတယ်", 403);
    const kind = String(body.kind ?? "");
    const amount = Number(body.amount);
    const label = String(body.label ?? "").trim();
    const entryDate = String(body.entryDate ?? "");
    const paymentMethod = String(body.paymentMethod ?? "Cash");
    if (!["capital", "stock_expense"].includes(kind) || !label || !Number.isSafeInteger(amount) || amount <= 0 || amount > 99999999999999) return bad("အမျိုးအစား၊ နာမည်နဲ့ ပမာဏကို မှန်ကန်စွာဖြည့်ပါ");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || !["KPay", "Wave", "Bank", "Cash", "USDT"].includes(paymentMethod)) return bad("ရက်စွဲနဲ့ ငွေပေးချေမှုကို စစ်ပါ");
    const values = { kind, label, amount, entry_date: entryDate, payment_method: paymentMethod, note: String(body.note ?? "").trim() };
    if (body.action === "edit-finance") {
      const { data: updated, error } = await ctx.supabase.from("finance_entries").update(values).eq("id", Number(body.id)).eq("workspace_id", ctx.member.workspace_id).select("id").maybeSingle();
      if (error) return bad(error.message);
      if (!updated) return bad("ပြင်နိုင်သည့် မှတ်တမ်းမတွေ့ပါ", 404);
      return Response.json({ saved: true });
    }
    const { error } = await ctx.supabase.from("finance_entries").insert({ ...values, workspace_id: ctx.member.workspace_id });
    if (error) return bad(error.message);
    return Response.json({ saved: true }, { status: 201 });
  }

  if (body.action === "add-product") {
    if (ctx.member.role !== "admin") return bad("Admin သာ Product ထည့်နိုင်ပါတယ်", 403);
    const name = String(body.name ?? "").trim();
    if (!name) return bad("Product name ဖြည့်ပါ");
    const { data, error } = await ctx.supabase.from("products").insert({
      workspace_id: ctx.member.workspace_id,
      name,
      package_name: String(body.packageName ?? "").trim(),
      purchase_price: Math.max(0, Number(body.purchasePrice) || 0),
      default_sale_price: Math.max(0, Number(body.defaultSalePrice) || 0),
      stock: Math.max(0, Number(body.stock) || 0),
      low_stock_at: Math.max(0, Number(body.lowStockAt) || 5),
      supplier: String(body.supplier ?? "").trim(),
      stock_note: String(body.stockNote ?? "").trim(),
    }).select("id").single();
    if (error) return bad(error.message, 400);
    return Response.json({ product: data }, { status: 201 });
  }

  if (body.action === "edit-product") {
    if (ctx.member.role !== "admin") return bad("Admin သာ Product ပြင်နိုင်ပါတယ်", 403);
    const id = Number(body.id);
    const name = String(body.name ?? "").trim();
    const purchasePrice = Number(body.purchasePrice);
    const defaultSalePrice = Number(body.defaultSalePrice);
    const stock = Number(body.stock);
    const lowStockAt = Number(body.lowStockAt);
    if (!Number.isSafeInteger(id) || id < 1 || !name || ![purchasePrice, defaultSalePrice, stock, lowStockAt].every(n => Number.isSafeInteger(n) && n >= 0)) return bad("Product အချက်အလက်ကို မှန်ကန်စွာဖြည့်ပါ");
    const { data: updated, error } = await ctx.supabase.from("products").update({
      name, package_name: String(body.packageName ?? "").trim(), purchase_price: purchasePrice,
      default_sale_price: defaultSalePrice, stock, low_stock_at: lowStockAt,
      supplier: String(body.supplier ?? "").trim(), stock_note: String(body.stockNote ?? "").trim(),
    }).eq("id", id).eq("workspace_id", ctx.member.workspace_id).select("id").maybeSingle();
    if (error) return bad(error.message);
    if (!updated) return bad("ပြင်နိုင်သည့် Product မတွေ့ပါ", 404);
    return Response.json({ saved: true });
  }

  if (body.action === "add-sale") {
    const productId = Number(body.productId);
    const quantity = Math.max(1, Number(body.quantity) || 1);
    const salePrice = Math.max(0, Number(body.salePrice) || 0);
    const paidAmount = Math.max(0, Number(body.paidAmount) || 0);
    const { data: saleId, error } = await ctx.supabase.rpc("record_sale", {
      p_product_id: productId,
      p_customer_name: String(body.customerName ?? "").trim(),
      p_customer_contact: String(body.customerContact ?? "").trim(),
      p_quantity: quantity,
      p_sale_price: salePrice,
      p_paid_amount: paidAmount,
      p_payment_method: String(body.paymentMethod ?? "KPay"),
      p_sale_date: String(body.saleDate ?? ""),
      p_expiry_date: String(body.expiryDate ?? ""),
      p_staff_name: ctx.member.display_name,
      p_note: String(body.note ?? "").trim(),
    });
    if (error) {
      const message = error.message.includes("Insufficient") ? "လက်ကျန် Stock မလုံလောက်ပါ" : error.message;
      return bad(message, 400);
    }
    return Response.json({ sale: { id: Number(saleId), customerName: body.customerName } }, { status: 201 });
  }

  if (body.action === "edit-sale") {
    if (ctx.member.role !== "admin") return bad("Admin သာ အရောင်းစာရင်းပြင်နိုင်ပါတယ်", 403);
    const id = Number(body.id), quantity = Number(body.quantity), salePrice = Number(body.salePrice), paidAmount = Number(body.paidAmount);
    const customerName = String(body.customerName ?? "").trim();
    const paymentMethod = String(body.paymentMethod ?? "KPay"), saleDate = String(body.saleDate ?? ""), expiryDate = String(body.expiryDate ?? "");
    if (![id, quantity, salePrice, paidAmount].every(Number.isSafeInteger) || id < 1 || quantity < 1 || salePrice < 0 || paidAmount < 0 || !customerName) return bad("အရောင်းအချက်အလက်ကို မှန်ကန်စွာဖြည့်ပါ");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate) || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || !["KPay", "Wave", "Bank", "Cash", "USDT"].includes(paymentMethod)) return bad("ရက်စွဲနဲ့ ငွေပေးချေမှုကို စစ်ပါ");
    const { error } = await ctx.supabase.rpc("edit_sale", { p_sale_id: id, p_customer_name: customerName, p_customer_contact: String(body.customerContact ?? "").trim(), p_quantity: quantity, p_sale_price: salePrice, p_paid_amount: paidAmount, p_payment_method: paymentMethod, p_sale_date: saleDate, p_expiry_date: expiryDate, p_note: String(body.note ?? "").trim() });
    if (error) return bad(error.message.includes("Insufficient") ? "လက်ကျန် Stock မလုံလောက်ပါ" : error.message);
    return Response.json({ saved: true });
  }

  if (body.action === "delete-sale") {
    if (ctx.member.role !== "admin") return bad("Admin သာ အရောင်းစာရင်းဖျက်နိုင်ပါတယ်", 403);
    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1) return bad("အရောင်း ID မမှန်ပါ");
    const { error } = await ctx.supabase.rpc("delete_sale", { p_sale_id: id, p_restore_stock: String(body.restoreStock) === "yes" });
    if (error) return bad(error.message);
    return Response.json({ saved: true });
  }

  return bad("Unknown action");
}
