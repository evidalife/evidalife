import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type Params = Promise<{ orderId: string }>;

function chfStr(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { orderId } = await params;

  // Auth check
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch order with items and invoice
  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, user_id, status, currency, total_amount, paid_at, created_at, order_items(id, product_name, product_sku, quantity, unit_price), invoices(id, invoice_number, created_at)')
    .eq('id', orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Verify ownership (or admin)
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (order.user_id !== user.id && !profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const invoice = order.invoices?.[0];
  const items = order.order_items ?? [];
  const subtotal = items.reduce((s: number, i: { unit_price: number; quantity: number }) => s + i.unit_price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.081 * 100) / 100;
  const invoiceDate = new Date(invoice?.created_at ?? order.created_at).toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  // ── Generate PDF ─────────────────────────────────────────────────────────────
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 20;
  let y = 20;

  // Header
  doc.setFillColor(14, 57, 61); // #0e393d
  doc.rect(0, 0, PAGE_W, 40, 'F');
  doc.setTextColor(242, 235, 219); // #f2ebdb
  doc.setFontSize(18);
  doc.text('EVIDA LIFE', MARGIN, 18);
  doc.setFontSize(10);
  doc.text('Rechnung / Invoice', MARGIN, 27);
  doc.setTextColor(206, 171, 132); // #ceab84
  doc.setFontSize(9);
  doc.text('evidalife.com', MARGIN, 34);

  y = 55;
  doc.setTextColor(28, 42, 43); // #1c2a2b

  // Invoice meta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice?.invoice_number ?? order.order_number, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 110, 111);
  doc.text(`Datum: ${invoiceDate}`, MARGIN, y + 7);
  doc.text(`Bestellung: ${order.order_number}`, MARGIN, y + 13);
  y += 30;

  // Divider
  doc.setDrawColor(14, 57, 61);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Column headers
  doc.setTextColor(90, 110, 111);
  doc.setFontSize(8);
  doc.text('ARTIKEL', MARGIN, y);
  doc.text('MENGE', 120, y);
  doc.text('PREIS', 150, y);
  doc.text('TOTAL', PAGE_W - MARGIN, y, { align: 'right' });
  y += 5;
  doc.setDrawColor(200, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // Items
  doc.setFontSize(9);
  doc.setTextColor(28, 42, 43);
  for (const item of items as { product_name: string | null; product_sku: string | null; quantity: number; unit_price: number }[]) {
    const name = item.product_name ?? 'Product';
    doc.text(name, MARGIN, y);
    doc.text(String(item.quantity), 120, y);
    doc.text(chfStr(item.unit_price), 150, y);
    doc.text(chfStr(item.unit_price * item.quantity), PAGE_W - MARGIN, y, { align: 'right' });
    y += 8;
  }

  // Totals
  y += 4;
  doc.setDrawColor(14, 57, 61);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  doc.setFontSize(9);
  doc.setTextColor(90, 110, 111);
  doc.text('Subtotal', 130, y);
  doc.text(chfStr(subtotal), PAGE_W - MARGIN, y, { align: 'right' });
  y += 6;
  doc.text('MwSt 8.1 %', 130, y);
  doc.text(chfStr(tax), PAGE_W - MARGIN, y, { align: 'right' });
  y += 6;

  doc.setDrawColor(14, 57, 61);
  doc.setLineWidth(0.5);
  doc.line(130, y, PAGE_W - MARGIN, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 57, 61);
  doc.text('Total', 130, y);
  doc.text(chfStr(order.total_amount), PAGE_W - MARGIN, y, { align: 'right' });

  // Footer
  const footerY = 275;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 160, 160);
  doc.text('Evida Life GmbH · Schweiz · evidalife.com', PAGE_W / 2, footerY, { align: 'center' });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const filename = `${invoice?.invoice_number ?? order.order_number}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
