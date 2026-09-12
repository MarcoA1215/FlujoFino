const fs = require('fs');
let calc = fs.readFileSync('apps/frontend/src/pages/Calculator.tsx', 'utf8');

if (!calc.includes('IonSelect')) {
    calc = calc.replace(
        "  IonInput, useIonToast, \r\n} from '@ionic/react';",
        "  IonInput, useIonToast, IonSelect, IonSelectOption\r\n} from '@ionic/react';"
    );
    calc = calc.replace(
        "  IonInput, useIonToast, \n} from '@ionic/react';",
        "  IonInput, useIonToast, IonSelect, IonSelectOption\n} from '@ionic/react';"
    );
}

if (!calc.includes('DeliveryZone')) {
    calc = calc.replace(
        "import type { Product } from '../types';",
        "import type { Product, DeliveryZone } from '../types';"
    );
}

fs.writeFileSync('apps/frontend/src/pages/Calculator.tsx', calc, 'utf8');
