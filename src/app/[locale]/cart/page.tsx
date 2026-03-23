import { getLocale } from 'next-intl/server';
import CartContent from './CartContent';

export const metadata = { title: 'Warenkorb – Evida Life' };

export default async function CartPage() {
  const locale = await getLocale();
  return <CartContent locale={locale} />;
}
