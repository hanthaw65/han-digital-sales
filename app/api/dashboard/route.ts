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
  const [{ data: products, error: productError }, { data: sales, error: saleError }] = await Promise.all([
    ctx.supabase.from("products").select("*").eq("workspace_id", ctx.member.workspace_id).order("name"),
    ctx.supabase.from("sales").select("*").eq("workspace_id", ctx.member.workspace_id).order("sale_date", { ascending: false }).limit(250),
  ]);
  if (productError || saleError) return bad(productError?.message || saleError?.message || "Data မရနိုင်ပါ", 500);
  return Response.json({
    user: { displayName: ctx.member.display_name, role: ctx.member.role },
    products: (products ?? []).map(p => ({
      id: Number(p.id), name: p.name, packageName: p.package_name, purchasePrice: Number(p.purchase_price),
      defaultSalePrice: Number(p.default_sale_price), stock: p.stock, lowStockAt: p.low_stock_at, supplier: p.supplier,
    })),
    sales: (sales ?? []).map(s => ({
      id: Number(s.id), productName: s.product_name, customerName: s.customer_name, customerContact: s.customer_contact,
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
    }).select("id").single();
    if (error) return bad(error.message, 400);
    return Response.json({ product: data }, { status: 201 });
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

  return bad("Unknown action");
}
