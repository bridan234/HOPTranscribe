import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { createBrowserHistory } from 'history';

const browserHistory = createBrowserHistory();
const reactPlugin = new ReactPlugin();

// Get connection string from environment variable (replaced at runtime by env.sh)
const connectionString = '__APPLICATIONINSIGHTS_CONNECTION_STRING__'.startsWith('__APPLICATION')
  ? undefined
  : '__APPLICATIONINSIGHTS_CONNECTION_STRING__';

let appInsights: ApplicationInsights | null = null;

if (connectionString) {
  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      extensions: [reactPlugin],
      extensionConfig: {
        [reactPlugin.identifier]: { history: browserHistory }
      },
      enableAutoRouteTracking: true,
      disableAjaxTracking: false,
      autoTrackPageVisitTime: true,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
    }
  });

  appInsights.loadAppInsights();
  appInsights.trackPageView();
}

export { appInsights, reactPlugin };
