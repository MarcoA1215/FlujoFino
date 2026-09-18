const fs = require('fs');

let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');

const listHTML = `
              {isClientMode ? (
                <IonList>
                  {filteredData.map(p => (
                    <IonItem key={p.id}>
                      <IonLabel>
                        <h2><strong>{p.name}</strong></h2>
                        <p>Precio: $${"$"}{p.salePrice.toFixed(2)}</p>
                      </IonLabel>
                      <IonBadge slot="end" color={p.stockQuantity > 0 ? 'success' : 'danger'}>
                        Disponible: {p.stockQuantity}
                      </IonBadge>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <IonGrid className="ion-no-padding">
                  <IonRow>
                    {filteredData.map(p => (
                      <ProductCard isClientMode={isClientMode}
                        key={p.id}
                        product={p}
                        onEdit={openEditProductAlert}
                        onDelete={handleDeleteProduct}
                        onConfigure={() => setSelectedProductForRecipe(p)}
                        onAdjustStock={openAdjustStockAlert}
                        onRegisterLoss={openRegisterLossAlert}
                        onToggleKitting={handleToggleKitting}
                        onUnpackKit={handleUnpackKit}
                      />
                    ))}
                  </IonRow>
                </IonGrid>
              )}
`;

p = p.replace(/<IonGrid className="ion-no-padding">[\s\S]*?<IonRow>[\s\S]*?\{filteredData\.map[\s\S]*?<ProductCard[\s\S]*?\/>\s*\)\}\s*<\/IonRow>\s*<\/IonGrid>/, listHTML);

fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
console.log('Fixed list view');
