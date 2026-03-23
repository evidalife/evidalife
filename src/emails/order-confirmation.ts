type OrderItem = {
  product_name: string | null;
  quantity: number;
  unit_price: number;
};

type OrderConfirmationParams = {
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  ordersUrl: string;
};

function chf(amount: number) {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function orderConfirmationHtml(params: OrderConfirmationParams): string {
  const { orderNumber, items, totalAmount, currency, ordersUrl } = params;
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.081 * 100) / 100;

  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e8f0ef;font-size:14px;color:#1c2a2b;">
        ${item.product_name ?? 'Product'}${item.quantity > 1 ? ` × ${item.quantity}` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e8f0ef;font-size:14px;color:#1c2a2b;text-align:right;">
        ${chf(item.unit_price * item.quantity)}
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0e393d;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#ceab84;font-weight:600;">EVIDA LIFE</p>
            <h1 style="margin:0;font-size:24px;font-weight:400;color:#f2ebdb;">Bestellbestätigung</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#ceab84;">Order Confirmation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#1c2a2b;line-height:1.6;">
              Vielen Dank für deine Bestellung bei Evida Life.<br>
              <span style="color:#5a6e6f;font-size:14px;">Thank you for your order.</span>
            </p>

            <p style="margin:0 0 8px;font-size:12px;color:#5a6e6f;text-transform:uppercase;letter-spacing:0.1em;">Bestellnummer / Order</p>
            <p style="margin:0 0 28px;font-size:18px;font-weight:600;color:#0e393d;">${orderNumber}</p>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #0e393d;margin-bottom:24px;">
              ${itemRows}
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#5a6e6f;">Subtotal</td>
                <td style="padding:8px 0;font-size:13px;color:#5a6e6f;text-align:right;">${chf(subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0 12px;font-size:13px;color:#5a6e6f;">MwSt 8.1 %</td>
                <td style="padding:4px 0 12px;font-size:13px;color:#5a6e6f;text-align:right;">${chf(tax)}</td>
              </tr>
              <tr style="border-top:2px solid #0e393d;">
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0e393d;">Total</td>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#0e393d;text-align:right;">${currency} ${totalAmount.toLocaleString('de-CH', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin-top:32px;">
              <a href="${ordersUrl}" style="display:inline-block;background:#0e393d;color:#f2ebdb;text-decoration:none;font-size:14px;font-weight:500;padding:14px 32px;border-radius:50px;">
                Bestellungen ansehen →
              </a>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f4f0;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#5a6e6f;line-height:1.6;">
              Evida Life GmbH · Schweiz<br>
              <a href="https://evidalife.com" style="color:#0e393d;text-decoration:none;">evidalife.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
