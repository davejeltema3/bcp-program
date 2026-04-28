'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /checkout redirects to / since the root page IS the checkout.
 * Preserves any query params (like ?email=).
 */
export default function CheckoutRedirect() {
  const router = useRouter();

  useEffect(() => {
    const params = window.location.search;
    router.replace(`/${params}`);
  }, [router]);

  return null;
}
