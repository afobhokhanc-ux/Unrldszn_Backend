// ==============================
// Order confirmation page
// ==============================
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
const result = document.getElementById('orderResult');
const loading = document.getElementById('orderLoading');
const ref = new URLSearchParams(window.location.search).get('ref');

function el(tag, className, text){
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function show(heading, message, extra){
  loading.style.display = 'none';
  result.innerHTML = '';
  const box = el('div', 'checkout-notice');
  box.append(el('h3', '', heading), el('p', '', message));
  if (extra) box.append(extra);
  result.appendChild(box);
  return box;
}

function link(href, text, className){
  const a = el('a', className || 'btn btn-solid', text);
  a.href = href;
  return a;
}

function orderDetails(order){
  const wrap = el('div', 'order-details');

  const list = el('div', 'order-items');
  order.items.forEach(item => {
    const row = el('div', 'summary-row');
    row.append(el('span', '', `${item.qty} × ${item.name}`), el('span', '', naira(item.lineTotal)));
    list.appendChild(row);
  });
  wrap.appendChild(list);

  const totals = el('div', 'summary-totals');
  const sub = el('div', 'summary-row'); sub.append(el('span', '', 'Subtotal'), el('span', '', naira(order.subtotal)));
  const ship = el('div', 'summary-row'); ship.append(el('span', '', 'Delivery'), el('span', '', order.shipping === 0 ? 'Free' : naira(order.shipping)));
  const tot = el('div', 'summary-row summary-total'); tot.append(el('span', '', 'Total paid'), el('span', '', naira(order.total)));
  totals.append(sub, ship, tot);
  wrap.appendChild(totals);

  const d = order.delivery;
  const addr = el('div', 'order-address');
  addr.append(
    el('strong', '', 'Delivering to'),
    el('span', '', d.fullName),
    el('span', '', d.address),
    el('span', '', `${d.city}, ${d.state}`),
    el('span', '', d.phone)
  );
  wrap.appendChild(addr);
  return wrap;
}

let checks = 0;

async function loadOrder(){
  if (!ref){
    show('No order found', 'We couldn\'t tell which order to show.', link('shop.html', 'Back to the shop'));
    return;
  }

  try {
    const me = await (await fetch('/api/me')).json();
    if (!me.loggedIn){
      show('Please log in', 'Log in to see your order.', link('index.html', 'Go to the homepage'));
      return;
    }

    const res = await fetch('/api/orders/' + encodeURIComponent(ref));
    if (res.status === 404){
      show('Order not found', 'We couldn\'t find that order on your account.', link('shop.html', 'Back to the shop'));
      return;
    }
    const order = await res.json();

    if (order.status === 'paid'){
      // The order is placed, so empty the cart on this device
      localStorage.removeItem('unrldszn_cart');
      const box = show('Thank you! Your order is confirmed', `Order ${order.reference}. We've received your payment and will be in touch about delivery.`);
      box.appendChild(orderDetails(order));
      box.appendChild(link('shop.html', 'Continue shopping'));
      return;
    }

    if (order.status === 'failed'){
      show('Payment didn\'t go through', 'You haven\'t been charged for this order. Your cart is still saved, so you can try again.', link('checkout.html', 'Try again'));
      return;
    }

    // Still pending: Paystack may need a few seconds to confirm
    checks++;
    if (checks < 4){
      loading.style.display = 'block';
      loading.textContent = 'Confirming your payment with Paystack...';
      setTimeout(loadOrder, 3000);
      return;
    }
    const again = el('button', 'btn btn-outline', 'Check again');
    again.addEventListener('click', () => { checks = 0; loadOrder(); });
    show('We\'re still waiting for confirmation', 'If you were charged, your order will update shortly. If not, you can go back and try again.', again);
  } catch (err) {
    show('Something went wrong', 'Please refresh this page.');
  }
}

loadOrder();
