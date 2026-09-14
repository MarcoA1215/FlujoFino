const fs = require('fs');

function fixProd() {
  const file = 'apps/frontend/src/pages/Production.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace("<IonList>", "<>\n          <IonList>");
  text = text.replace("</IonInfiniteScroll>", "</IonInfiniteScroll>\n          </>");
  fs.writeFileSync(file, text, 'utf8');
}
fixProd();

function fixOrders() {
  const file = 'apps/frontend/src/pages/Orders.tsx';
  let text = fs.readFileSync(file, 'utf8');
  // strip the weird character at start of line 2
  text = text.replace(/^[^\w\s{/'"]+/gm, "");
  fs.writeFileSync(file, text, 'utf8');
}
fixOrders();
