import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

// Import StatusBar no-op stub early to neutralize native status-bar calls
import './app/statusbar-noop';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
